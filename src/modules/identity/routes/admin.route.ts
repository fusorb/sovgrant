// src/modules/identity/routes/admin.route.ts

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import { listIdentitiesAdminFlow } from "../flows/list-identities-admin.flow";
import { suspendIdentityFlow } from "../flows/suspend-identity.flow";
import { updateIdentityStatusFlow } from "../flows/update-identity-status.flow";

export async function adminRoute(fastify: FastifyInstance) {
  // GET /identity/admin
  fastify.get(
    "/admin",
    {
      preHandler: [
        fastify.auth.requireUser,
        fastify.auth.requirePermission("admin:system", "SYSTEM"),
      ],
      schema: {
        tags: ["Identity Vault"],
        summary: "Admin: list identities",
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(100).default(20),
          page: z.coerce.number().int().min(1).default(1),
          status: z
            .enum(["ACTIVE", "SUSPENDED", "BANNED", "PENDING", "DELETED"])
            .optional(),
          search: z.string().optional(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
            meta: z.object({
              total: z.number(),
              page: z.number(),
              limit: z.number(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      const query = req.query as {
        limit: number;
        page: number;
        status?: "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING" | "DELETED";
        search?: string;
      };

      const result = await flowExecutor.run(listIdentitiesAdminFlow, query, {
        identityId: req.identity.id,
        tenantId: req.identity.tenantId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: req.id,
      });

      return reply.send({
        success: true,
        data: result.identities,
        meta: { total: result.total, page: result.page, limit: result.limit },
      });
    },
  );

  // POST /identity/admin/:id/suspend
  fastify.post(
    "/admin/:id/suspend",
    {
      preHandler: [
        fastify.auth.requireUser,
        fastify.auth.requirePermission("admin:system", "SYSTEM"),
      ],
      schema: {
        tags: ["Identity Vault"],
        summary: "Admin: suspend identity",
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string() }),
        body: z.object({ reason: z.string().optional() }),
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { reason } = req.body as { reason?: string };

      await flowExecutor.run(
        suspendIdentityFlow,
        { id, reason },
        {
          identityId: req.identity.id,
          tenantId: req.identity.tenantId,
          ip: req.ip ?? "0.0.0.0",
          userAgent: req.headers["user-agent"],
          requestId: req.id,
        },
      );

      return reply.send({ success: true });
    },
  );

  // PATCH /identity/:id/status
  fastify.patch(
    "/:id/status",
    {
      preHandler: [
        fastify.auth.requireUser,
        fastify.auth.requirePermission("admin:system", "SYSTEM"),
      ],
      schema: {
        tags: ["Identity Vault"],
        summary: "Admin: update identity status",
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string() }),
        body: z.object({
          status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]),
          reason: z.string().optional(),
        }),
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { status, reason } = req.body as {
        status: "ACTIVE" | "SUSPENDED" | "BANNED";
        reason?: string;
      };

      await flowExecutor.run(
        updateIdentityStatusFlow,
        { id, status, reason },
        {
          identityId: req.identity.id,
          tenantId: req.identity.tenantId,
          ip: req.ip ?? "0.0.0.0",
          userAgent: req.headers["user-agent"],
          requestId: req.id,
        },
      );

      return reply.send({ success: true });
    },
  );
}
