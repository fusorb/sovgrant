// src/modules/tenant/routes/policy.route.ts
// NOTE: Mounted under /tenants prefix — full paths are /tenants/:tenantId/policy
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import { getTenantPolicyFlow } from "../flows/get-tenant-policy.flow";
import { updateTenantPolicyFlow } from "../flows/update-tenant-policy.flow";

export async function policyRoute(fastify: FastifyInstance) {
  // GET /tenants/:tenantId/policy
  fastify.get(
    "/:tenantId/policy",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Tenant Management Architecture"],
        summary: "Get the current policy configuration for this tenant",
        security: [{ bearerAuth: [] }],
        // FIXED: was z.string().uuid()
        params: z.object({ tenantId: z.string().cuid() }),
        response: {
          200: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };

      const result = await flowExecutor.run(
        getTenantPolicyFlow,
        { tenantId },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: result });
    },
  );

  // PATCH /tenants/:tenantId/policy
  fastify.patch(
    "/:tenantId/policy",
    {
      preHandler: [
        fastify.auth.requireUser,
        fastify.auth.requirePermission("policy:update"),
      ],
      schema: {
        tags: ["Tenant Management Architecture"],
        summary:
          "Update policy configuration — MFA enforcement, session TTL, allowed domains",
        security: [{ bearerAuth: [] }],
        params: z.object({ tenantId: z.string().cuid() }),
        body: z.object({
          requireMfa: z.boolean().optional(),
          requireLegalConsent: z.boolean().optional(),
          sessionTtlMinutes: z.number().int().min(5).max(10080).optional(),
          allowedEmailDomains: z.array(z.string()).optional(),
          maxSessionsPerUser: z.number().int().min(1).max(100).optional(),
          allowPasskeys: z.boolean().optional(),
        }),
        response: {
          200: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };
      const body = req.body as Record<string, any>;

      const result = await flowExecutor.run(
        updateTenantPolicyFlow,
        { tenantId, data: body },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: result });
    },
  );
}
