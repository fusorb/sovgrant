// src/modules/tenant/routes/membership.route.ts
import type { FastifyInstance } from "fastify";
import { flowExecutor } from "@/core/flows";
import { addMemberFlow } from "../flows/add-member.flow";
import { listMembersFlow } from "../flows/list-members.flow";
import { removeMemberFlow } from "../flows/remove-member.flow";
import { AddMemberSchema } from "../validators/tenant.schemas";
import { z } from "zod";

export async function membershipRoute(fastify: FastifyInstance) {
  // GET /:tenantId/members
  // FIX: this endpoint did not exist — tenantSdk.listMembers() already called it,
  // but the route was never implemented. Returns membership rows enriched with
  // identity email/name/picture (see presentMembershipWithIdentity) so the
  // <MemberRow> component doesn't need a second lookup per row.
  fastify.get(
    "/:tenantId/members",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Tenant Management Architecture"],
        summary: "List members of an organisation, enriched with identity info",
        security: [{ bearerAuth: [] }],
        params: z.object({ tenantId: z.string().cuid() }),
        response: {
          200: z.object({ success: z.boolean(), data: z.array(z.any()) }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };

      const result = await flowExecutor.run(
        listMembersFlow,
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

  // POST /:tenantId/members
  fastify.post(
    "/:tenantId/members",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Tenant Management Architecture"],
        summary: "Bind an identity as a member of an organisation space",
        security: [{ bearerAuth: [] }],
        params: z.object({ tenantId: z.string().cuid() }),
        body: AddMemberSchema,
        response: { 201: z.object({ success: z.boolean(), data: z.any() }) },
      },
    },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };
      const result = await flowExecutor.run(
        addMemberFlow,
        { ...(req.body as object), tenantId },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          plan: req.identity.plan, // FIX: was missing — ctx.plan was always undefined
          // → cap always enforced as FREE (3 members)
          // → PRO/ENTERPRISE tenants couldn't invite anyone
        },
      );
      return reply.status(201).send({ success: true, data: result });
    },
  );

  // DELETE /:tenantId/members/:identityId
  fastify.delete(
    "/:tenantId/members/:identityId",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Tenant Management Architecture"],
        summary: "Remove an identity's membership from the organisation",
        security: [{ bearerAuth: [] }],
        params: z.object({
          tenantId: z.string().cuid(),
          identityId: z.string().cuid(),
        }),
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (req, reply) => {
      const { tenantId, identityId } = req.params as {
        tenantId: string;
        identityId: string;
      };
      await flowExecutor.run(
        removeMemberFlow,
        { tenantId, identityId },
        { identityId: req.identity.id, tenantId },
      );
      return reply.send({ success: true });
    },
  );
}
