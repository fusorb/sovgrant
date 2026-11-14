// src/modules/tenant/routes/tenant.route.ts
import type { FastifyInstance } from "fastify";
import { flowExecutor } from "@/core/flows";
import { ApiError } from "@/core/errors/api-error";
import { createTenantFlow } from "../flows/create-tenant.flow";
import { getTenantBySlugFlow } from "../flows/get-tenant-by-slug.flow";
import { getTenantJwksFlow } from "../flows/get-tenant-jwks.flow";
import { z } from "zod";

export async function tenantRoute(fastify: FastifyInstance) {
  // ── POST / — provision a new tenant ──────────────────────────────────────────
  fastify.post(
    "/",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Tenant Management Architecture"],
        summary: "Provision a new organisation",
        security: [{ bearerAuth: [] }],
        body: z.object({ name: z.string().min(1), slug: z.string().min(1) }),
        response: { 201: z.object({ success: z.boolean(), data: z.any() }) },
      },
    },
    async (req, reply) => {
      const result = await flowExecutor.run(createTenantFlow, req.body, {
        identityId: req.identity.id,
        tenantId: null,
      });
      return reply.status(201).send({ success: true, data: result });
    },
  );

  // ── GET /:slug — fetch organisation by slug ──────────────────────────────────
  fastify.get(
    "/:slug",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Tenant Management Architecture"],
        summary: "Fetch organisation by slug",
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string().min(1) }),
        response: { 200: z.object({ success: z.boolean(), data: z.any() }) },
      },
    },
    async (req, reply) => {
      const { slug } = req.params as { slug: string };

      const result = await flowExecutor.run(
        getTenantBySlugFlow,
        { slug },
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

  // ── GET /:slug/jwks — public JWKS endpoint ─────────────────────────────────
  // Intentionally has NO auth — JWKS is always public so relying parties
  // can verify credentials without an SovGrant account.
  fastify.get(
    "/:slug/jwks",
    {
      schema: {
        tags: ["Tenant Management Architecture"],
        summary: "Resolve tenant public signing keys (JWKS)",
        params: z.object({ slug: z.string().min(1) }),
        response: {
          200: z.object({ keys: z.array(z.record(z.string(), z.any())) }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const { slug } = req.params as { slug: string };

      try {
        const result = await flowExecutor.run(
          getTenantJwksFlow,
          { slug },
          {
            identityId: undefined,
            tenantId: null,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
          },
        );
        return reply.send(result);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 404) {
          return reply.status(404).send({ error: "NOT_FOUND" });
        }
        throw error;
      }
    },
  );
}
