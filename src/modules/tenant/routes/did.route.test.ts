// src/modules/tenant/routes/did.route.test.ts
//
// Proves the route-level requirePermission("did:manage") preHandler works and
// that POST /:tenantId/did delegates provisioning to the canonical flow
// (provisionTenantDidFlow) rather than minting a throwaway keypair inline:
//   - A caller without "did:manage" gets 403
//   - A caller with "did:manage" gets the flow result back as 201
//   - A flow conflict surfaces as 409 through the shared errorHandler

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { ApiError } from "@/core/errors/api-error";
import { errorHandler } from "@/core/errors/error-handler";
import { tenantDidRoute } from "./did.route";

// ── Mock the flow layer (this is a route-contract test) ──────────────────────

vi.mock("@/core/flows", () => ({
  FlowExecutor: vi.fn(),
  flowExecutor: { run: vi.fn() },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const tenantId = "cltenant000001testtenant1";

function buildApp(permissionGranted: boolean) {
  const fastify = Fastify();
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.setErrorHandler(errorHandler);

  // Mirrors production: every auth guard delegates to requireUser, which
  // populates req.identity from the bearer token.
  const requireUser = vi.fn(async (req: any) => {
    req.identity = {
      id: "test-user",
      tenantId,
      scope: [],
      plan: "PRO",
    };
  });

  fastify.decorate("auth", {
    requireUser,
    requireScope: vi.fn(() => async (req: any) => {
      await requireUser(req);
    }),
    requirePlan: vi.fn(() => async (req: any) => {
      await requireUser(req);
    }),
    requireAal2: vi.fn(),
    requireElevated: vi.fn(),
    requirePermission: vi.fn(
      (_action: string) => async (req: any, _reply: any) => {
        await requireUser(req);
        if (!permissionGranted) {
          throw ApiError.forbidden("Permission 'did:manage' is required");
        }
      },
    ),
  });
  fastify.decorate("db", {} as any);

  return fastify;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("DID route — requirePermission('did:manage')", () => {
  let fastify: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    fastify = buildApp(false);
    await fastify.register(tenantDidRoute, { prefix: "/tenants" });
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("without 'did:manage' permission", () => {
    it("POST /tenants/:tenantId/did returns 403", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: `/tenants/${tenantId}/did`,
        payload: { domain: "example.com" },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.message).toContain("did:manage");
    });
  });

  describe("with 'did:manage' permission", () => {
    beforeAll(async () => {
      await fastify.close();
      fastify = buildApp(true);
      await fastify.register(tenantDidRoute, { prefix: "/tenants" });
      await fastify.ready();
    });

    it("POST /tenants/:tenantId/did returns 201 with the flow result", async () => {
      const { flowExecutor } = await import("@/core/flows");
      (flowExecutor.run as any).mockResolvedValue({
        did: "did:web:example.com",
        document: { "@context": [], id: "did:web:example.com" },
      });

      const response = await fastify.inject({
        method: "POST",
        url: `/tenants/${tenantId}/did`,
        payload: { domain: "example.com" },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.did).toBe("did:web:example.com");
    });

    it("delegates provisioning to provisionTenantDidFlow with the tenant context", async () => {
      const { flowExecutor } = await import("@/core/flows");
      (flowExecutor.run as any).mockResolvedValue({
        did: "did:web:example.com",
        document: {},
      });

      await fastify.inject({
        method: "POST",
        url: `/tenants/${tenantId}/did`,
        payload: { domain: "example.com" },
      });

      expect(flowExecutor.run).toHaveBeenCalledWith(
        expect.any(Object),
        { tenantId, domain: "example.com" },
        expect.objectContaining({
          identityId: "test-user",
          tenantId,
        }),
      );
    });

    it("POST /tenants/:tenantId/did returns 409 when a DID already exists", async () => {
      const { flowExecutor } = await import("@/core/flows");
      (flowExecutor.run as any).mockRejectedValue(
        ApiError.conflict("Tenant already has a DID provisioned"),
      );

      const response = await fastify.inject({
        method: "POST",
        url: `/tenants/${tenantId}/did`,
        payload: { domain: "example.com" },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("CONFLICT");
    });
  });
});
