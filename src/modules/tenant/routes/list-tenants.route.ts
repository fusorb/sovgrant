// src/modules/tenant/routes/list-tenants.route.ts
//
// GET /api/v1/tenants — list all organisations the authenticated user
// has an ACTIVE membership in. Returns enriched tenant data including
// the user's role within each tenant.

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import { listTenantsFlow } from "../flows/list-tenants.flow";

export async function listTenantsRoute(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Tenant Management Architecture"],
        summary: "List organisations you belong to",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
                sector: z.string().nullable(),
                plan: z.string(),
                role: z.string(),
                createdAt: z.string(),
              }),
            ),
          }),
        },
      },
    },
    async (req, reply) => {
      const result = await flowExecutor.run(
        listTenantsFlow,
        {},
        {
          identityId: req.identity.id,
          tenantId: null,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: result });
    },
  );
}
