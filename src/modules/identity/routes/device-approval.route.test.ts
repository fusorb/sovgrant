// src/modules/identity/routes/device-approval.route.test.ts
//
// Pins the poll route to the same contract as create/approve/reject: a bearer
// token is required, and the caller's identityId reaches the poll flow (the
// flow gates the requester-context disclosure on it):
//   - unauthenticated GET -> 401, the flow is never reached
//   - authenticated GET   -> 200, the flow result is returned as-is, and the
//     flow context carries the caller's identityId

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
import { deviceApprovalRoute } from "./device-approval.route";

vi.mock("@/core/flows", () => ({
  FlowExecutor: vi.fn(),
  flowExecutor: { run: vi.fn() },
}));

const CHALLENGE = "challenge-abc";

function buildApp(authenticated: boolean) {
  const fastify = Fastify();
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.setErrorHandler(errorHandler);

  const requireUser = vi.fn(async (req: any) => {
    if (!authenticated) throw ApiError.unauthorized("Authentication required");
    req.identity = { id: "test-user", tenantId: null, scope: [] };
  });

  // The declared auth surface (the app's decoration type) must be complete even
  // though this route only uses requireUser.
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
      },
    ),
  });
  fastify.decorate("db", {} as any);

  return fastify;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("device-approval route — GET /device-approvals/:challenge", () => {
  describe("unauthenticated", () => {
    let fastify: ReturnType<typeof buildApp>;

    beforeAll(async () => {
      fastify = buildApp(false);
      await fastify.register(deviceApprovalRoute, { prefix: "/identity" });
      await fastify.ready();
    });

    afterAll(async () => {
      await fastify.close();
    });

    it("returns 401 and never reaches the poll flow", async () => {
      const { flowExecutor } = await import("@/core/flows");

      const response = await fastify.inject({
        method: "GET",
        url: `/identity/device-approvals/${CHALLENGE}`,
      });

      expect(response.statusCode).toBe(401);
      expect(flowExecutor.run).not.toHaveBeenCalled();
    });
  });

  describe("authenticated", () => {
    let fastify: ReturnType<typeof buildApp>;

    beforeAll(async () => {
      fastify = buildApp(true);
      await fastify.register(deviceApprovalRoute, { prefix: "/identity" });
      await fastify.ready();
    });

    afterAll(async () => {
      await fastify.close();
    });

    it("returns the flow result and passes the caller's identity to the poll flow", async () => {
      const { flowExecutor } = await import("@/core/flows");
      (flowExecutor.run as any).mockResolvedValue({
        status: "pending",
        requester: {
          ip: "203.0.113.7",
          userAgent: "SovPort/1.2 (iPhone)",
          email: "owner@example.com",
        },
      });

      const response = await fastify.inject({
        method: "GET",
        url: `/identity/device-approvals/${CHALLENGE}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("pending");
      expect(body.data.requester.ip).toBe("203.0.113.7");

      expect(flowExecutor.run).toHaveBeenCalledWith(
        expect.any(Object),
        { challenge: CHALLENGE },
        expect.objectContaining({ identityId: "test-user" }),
      );
    });
  });
});
