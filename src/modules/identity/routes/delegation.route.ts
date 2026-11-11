// src/modules/identity/routes/delegation.route.ts
//
// Delegation endpoints — deliberately not implemented; these return 501.
//
// AccessDelegation exists in prisma/schema.prisma, but nothing reads or writes
// it: no repository, flow or service references the model (its only mention is
// the tenant-isolation allow-list). Shipping CRUD here would let a caller
// "grant" scopes that no code path honours — worse than an honest 501 for an
// IAM product. The console nav entry, stub page and useDelegations hook were
// removed for the same reason.
//
// Before implementing, settle:
//   1. Which scopes are delegatable? (an allow-list, not free-form strings)
//   2. Who may be a grantee — another identity only, or a service client?
//   3. Where is a grant enforced? No token-issuing path consults it today;
//      enforcement has to land in the same change as the CRUD.
//   4. Revocation semantics: hard delete, or a revokedAt column for audit?
// Tracked as P1-3 in .agent/output.txt.
import type { FastifyInstance } from "fastify";
import { z } from "zod";

export async function delegationRoute(fastify: FastifyInstance) {
  // GET /identity/delegations — list delegations granted by this identity
  fastify.get(
    "/delegations",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Identity"],
        summary:
          "List delegations granted by this identity [not yet implemented]",
        security: [{ bearerAuth: [] }],
        response: {
          501: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    async (_req, reply) => {
      return reply.status(501).send({
        error: "NOT_IMPLEMENTED",
        message: "Delegation grants are not yet available.",
      });
    },
  );

  // POST /identity/delegations — create a new delegation grant
  fastify.post(
    "/delegations",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Identity"],
        summary: "Create a delegation grant [not yet implemented]",
        security: [{ bearerAuth: [] }],
        response: {
          501: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    async (_req, reply) => {
      return reply.status(501).send({
        error: "NOT_IMPLEMENTED",
        message: "Delegation grants are not yet available.",
      });
    },
  );

  // DELETE /identity/delegations/:id — revoke a delegation
  fastify.delete(
    "/delegations/:id",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Identity"],
        summary: "Revoke a delegation grant [not yet implemented]",
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string() }),
        response: {
          501: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    async (_req, reply) => {
      return reply.status(501).send({
        error: "NOT_IMPLEMENTED",
        message: "Delegation grants are not yet available.",
      });
    },
  );
}
