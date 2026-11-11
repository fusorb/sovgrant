// src/modules/identity/routes/delegation.route.ts
//
// Delegation endpoints — deliberately not implemented; these return 501.
//
// There is no delegation storage any more: AccessDelegation was an unfinished
// sketch (present since the initial setup, never wired, and with no link to
// Client, so no token-issuing path could ever have consulted it) and was
// dropped in migration 20261111000000_drop_access_delegation. The console nav
// entry, stub page and useDelegations hook were removed at the same time.
//
// Building this is a design task, not a CRUD task. Settle these first:
//   1. Which scopes are delegatable? (an allow-list, not free-form strings)
//   2. Who may be a grantee — another identity only, or a service client?
//   3. Where is a grant enforced? Model it as client-anchored token exchange
//      (RFC 8693, `act`/`sub` claims) enforced in the token flows, so that a
//      grant and its enforcement land in the same change.
//   4. Revocation semantics — plus which audit actions to (re-)introduce, the
//      DELEGATION_* enum values having been removed in 20260822000000.
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
