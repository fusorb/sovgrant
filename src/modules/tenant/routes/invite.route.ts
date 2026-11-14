// src/modules/tenant/routes/invite.route.ts
// POST /invites/accept — consumes a tenant invitation token and activates the membership.
//
// FIX: now uses tokenRecord.tenantId to find the exact membership row.
// Previously used findFirst({ orderBy: createdAt desc }) which could activate
// the wrong tenant's membership if an identity had multiple pending invites.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import { acceptInviteFlow } from "../flows/accept-invite.flow";

export async function inviteRoute(fastify: FastifyInstance) {
  fastify.post(
    "/invites/accept",
    {
      schema: {
        tags: ["Tenant Management Architecture"],
        summary: "Accept a tenant membership invitation via email token",
        body: z.object({ token: z.string().min(1) }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({ message: z.string(), tenantSlug: z.string() }),
          }),
          410: z.object({
            success: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
            success: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { token } = req.body as { token: string };

      const result = await flowExecutor.run(
        acceptInviteFlow,
        { token },
        {
          identityId: undefined,
          tenantId: null,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      if (result.kind === "expired") {
        return reply.status(410).send({
          success: false,
          error: "INVITE_EXPIRED_OR_USED",
          message:
            "This invitation is invalid, has already been used, or has expired. " +
            "Ask a tenant admin to send a new invite.",
        });
      }

      if (result.kind === "already_active") {
        return reply.send({
          success: true,
          data: {
            message: "You are already an active member of this organisation",
            tenantSlug: result.tenantSlug,
          },
        });
      }

      if (result.kind === "not_found") {
        return reply.status(404).send({
          success: false,
          error: "MEMBERSHIP_NOT_FOUND",
          message:
            "No pending invitation was found for your account. " +
            "The membership may have been removed by an admin.",
        });
      }

      return reply.send({
        success: true,
        data: {
          message: result.message,
          tenantSlug: result.tenantSlug,
        },
      });
    },
  );
}
