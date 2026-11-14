// src/modules/identity/routes/profile.route.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import { presentIdentity } from "../presenters/identity.presenter";
import { UpdateProfileSchema } from "../validators/identity.schemas";
import { getProfileFlow } from "../flows/get-profile.flow";
import { updateProfileFlow } from "../flows/update-profile.flow";
import { deleteProfileFlow } from "../flows/delete-profile.flow";

export async function profileRoute(fastify: FastifyInstance) {
  // GET /profile
  fastify.get(
    "/profile",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Identity & Profile"],
        summary:
          "Retrieve canonical identity profile with tenant memberships and roles",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req, reply) => {
      const identity = await flowExecutor.run(getProfileFlow, undefined, {
        identityId: req.identity.id,
        tenantId: req.identity.tenantId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: req.id,
      });

      return reply.send({
        success: true,
        data: {
          ...presentIdentity(identity),
          plan: req.identity.plan,
          tenantId: req.identity.tenantId,
          memberships: identity.memberships.map((m: any) => ({
            tenantId: m.tenantId,
            role: m.role.name,
            status: m.status,
            joinedAt: m.createdAt,
          })),
        },
      });
    },
  );

  // PATCH /profile — requireUser is sufficient (low-risk mutation)
  fastify.patch(
    "/profile",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Identity & Profile"],
        summary: "Update display name and profile picture",
        security: [{ bearerAuth: [] }],
        body: UpdateProfileSchema,
        response: {
          200: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req, reply) => {
      const body = req.body as z.infer<typeof UpdateProfileSchema>;

      const identity = await flowExecutor.run(updateProfileFlow, body, {
        identityId: req.identity.id,
        tenantId: req.identity.tenantId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: req.id,
      });

      return reply.send({ success: true, data: presentIdentity(identity) });
    },
  );

  // DELETE /profile
  // requireElevated: destroys the account, all sessions, and all tokens.
  fastify.delete(
    "/profile",
    {
      preHandler: fastify.auth.requireElevated,
      schema: {
        tags: ["Identity & Profile"],
        summary:
          "Permanently delete account (requires step-up re-authentication)",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    async (req, reply) => {
      await flowExecutor.run(deleteProfileFlow, undefined, {
        identityId: req.identity.id,
        tenantId: req.identity.tenantId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: req.id,
      });

      return reply.send({
        success: true,
        message: "Account permanently deleted",
      });
    },
  );
}
