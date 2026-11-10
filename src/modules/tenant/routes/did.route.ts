// src/modules/tenant/routes/did.route.ts
// NOTE: Mounted under /tenants prefix — full paths are /tenants/:tenantId/did
//
// Plan gating:
//   POST /:tenantId/did — requirePlan("PRO")
//     Provisioning a did:web DID is an enterprise identity capability.
//     It anchors the tenant as a verifiable issuer on the open web.
//     FREE tenants have no need for it — they can't issue VCs anyway.
//
//   GET /:tenantId/did — requireUser (no plan gate)
//     Reading a DID document is a low-risk read. Any tenant member may
//     need to inspect their tenant's DID for integration purposes.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import { provisionTenantDidFlow } from "../flows/provision-tenant-did.flow";
import { TenantService } from "../services/tenant.service";

export async function tenantDidRoute(fastify: FastifyInstance) {
  // POST /tenants/:tenantId/did
  fastify.post(
    "/:tenantId/did",
    {
      preHandler: [
        fastify.auth.requirePlan("PRO"),
        fastify.auth.requirePermission("did:manage"),
      ],
      schema: {
        tags: ["Tenant Management Architecture"],
        summary:
          "Provision a did:web Decentralized Identifier for this tenant (PRO)",
        security: [{ bearerAuth: [] }],
        params: z.object({ tenantId: z.string().cuid() }),
        body: z.object({
          domain: z.string().min(1).describe("e.g. health.sg.fusorb.com"),
        }),
        response: {
          201: z.object({
            success: z.boolean(),
            data: z.object({ did: z.string(), document: z.any() }),
          }),
          409: z.object({
            success: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };
      const { domain } = req.body as { domain: string };

      // Business logic lives in the flow: it binds the DID document to the
      // tenant's real ACTIVE TenantSigningKey (the same key that signs VCs),
      // creating one if none exists. The previous inline handler generated a
      // throwaway keypair, discarded the private half, and published a
      // mismatched verification method - so issued VCs never verified.
      const result = await flowExecutor.run(
        provisionTenantDidFlow,
        { tenantId, domain },
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

  // GET /tenants/:tenantId/did — requireUser, no plan gate
  fastify.get(
    "/:tenantId/did",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Tenant Management Architecture"],
        summary: "Fetch the DID document for this tenant",
        security: [{ bearerAuth: [] }],
        params: z.object({ tenantId: z.string().cuid() }),
        response: {
          200: z.object({ success: z.boolean(), data: z.any() }),
          404: z.object({
            success: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };

      const tenantService = new TenantService(fastify.db);
      await tenantService.assertMembership(tenantId, req.identity.id);

      const did = await fastify.db.decentralizedIdentifier.findUnique({
        where: { tenantId },
      });
      if (!did) {
        return reply.status(404).send({
          success: false,
          error: "NOT_FOUND",
          message: "No DID provisioned for this tenant",
        });
      }
      return reply.send({
        success: true,
        data: { did: did.id, document: did.didDocument },
      });
    },
  );
}
