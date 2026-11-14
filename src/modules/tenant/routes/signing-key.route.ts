// src/modules/tenant/routes/signing-key.route.ts
// NOTE: Mounted under /tenants prefix — full paths are /tenants/:tenantId/signing-keys
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import { createSigningKeyFlow } from "../flows/create-signing-key.flow";
import { listSigningKeysFlow } from "../flows/list-signing-keys.flow";
import { revokeSigningKeyFlow } from "../flows/revoke-signing-key.flow";

export async function signingKeyRoute(fastify: FastifyInstance) {
  // ── POST /:tenantId/signing-keys ─────────────────────────────────────────
  // PRO: Custom signing keypairs are a PRO/ENTERPRISE feature.
  // FREE tenants use the system-level JWT signing key for all operations.
  fastify.post(
    "/:tenantId/signing-keys",
    {
      preHandler: [
        fastify.auth.requirePlan("PRO"),
        fastify.auth.requirePermission("signing-key:manage"),
      ],
      schema: {
        tags: ["Tenant Cryptographic Key Authority"],
        summary:
          "Generate an asymmetric EC keypair bound to this tenant for VC/token signing (PRO)",
        security: [{ bearerAuth: [] }],
        params: z.object({ tenantId: z.string().cuid() }),
        response: {
          201: z.object({
            success: z.boolean(),
            data: z.object({
              kid: z.string(),
              algorithm: z.string(),
              publicKey: z.string(),
              status: z.string(),
              createdAt: z.coerce.string(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };

      const result = await flowExecutor.run(
        createSigningKeyFlow,
        { tenantId },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.status(201).send({ success: true, data: result });
    },
  );

  // ── GET /:tenantId/signing-keys ──────────────────────────────────────────
  // PRO: Listing signing keys is only meaningful when the tenant can create them.
  fastify.get(
    "/:tenantId/signing-keys",
    {
      preHandler: fastify.auth.requirePlan("PRO"),
      schema: {
        tags: ["Tenant Cryptographic Key Authority"],
        summary: "List active signing key metadata for this tenant (PRO)",
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
        listSigningKeysFlow,
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

  // ── DELETE /:tenantId/signing-keys/:kid ───────────────────────────────────
  // requireElevated: revoking a signing key is irreversible and tenant-wide.
  // This also implicitly requires PRO (you can't have keys without PRO).
  fastify.delete(
    "/:tenantId/signing-keys/:kid",
    {
      preHandler: [
        fastify.auth.requireElevated,
        fastify.auth.requirePermission("signing-key:manage"),
      ],
      schema: {
        tags: ["Tenant Cryptographic Key Authority"],
        summary:
          "Revoke a tenant signing key by KID (requires step-up re-authentication)",
        security: [{ bearerAuth: [] }],
        params: z.object({
          tenantId: z.string().cuid(),
          kid: z.string().min(1),
        }),
        response: {
          200: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId, kid } = req.params as {
        tenantId: string;
        kid: string;
      };

      const result = await flowExecutor.run(
        revokeSigningKeyFlow,
        { tenantId, kid },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send(result);
    },
  );
}
