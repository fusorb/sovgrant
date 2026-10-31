// src/modules/identity/routes/paired-device.route.ts

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import { registerPairedDeviceFlow } from "../flows/register-paired-device.flow";
import { listPairedDevicesFlow } from "../flows/list-paired-devices.flow";
import { revokePairedDeviceFlow } from "../flows/revoke-paired-device.flow";

export async function pairedDeviceRoute(fastify: FastifyInstance) {
  const withZod = fastify.withTypeProvider<ZodTypeProvider>();

  withZod.post(
    "/paired-devices",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["SovPort Integration"],
        summary: "Register a paired SovPort device",
        description: "Registers the device public key for biometric-authenticated operations",
        security: [{ bearerAuth: [] }],
        body: z.object({
          deviceId: z.string().min(1).max(128),
          publicKey: z.string().min(1).max(2048),
          name: z.string().max(128).optional(),
          platform: z.string().max(32).optional(),
        }),
        response: {
          201: z.object({ success: z.boolean(), data: z.object({ id: z.string(), deviceId: z.string() }) }),
        },
      },
    },
    async (req, reply) => {
      const result = await flowExecutor.run(registerPairedDeviceFlow, req.body, {
        identityId: req.identity.id,
        tenantId: null,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return reply.status(201).send({ success: true, data: result });
    },
  );

  withZod.get(
    "/paired-devices",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["SovPort Integration"],
        summary: "List paired devices",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({ success: z.boolean(), data: z.array(z.any()) }),
        },
      },
    },
    async (req) => {
      const result = await flowExecutor.run(listPairedDevicesFlow, {}, {
        identityId: req.identity.id,
        tenantId: null,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return { success: true, data: result };
    },
  );

  withZod.delete(
    "/paired-devices/:deviceId",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["SovPort Integration"],
        summary: "Revoke a paired device",
        security: [{ bearerAuth: [] }],
        params: z.object({ deviceId: z.string() }),
        response: {
          200: z.object({ success: z.boolean(), data: z.object({ revoked: z.boolean() }) }),
        },
      },
    },
    async (req) => {
      const result = await flowExecutor.run(revokePairedDeviceFlow, { deviceId: (req.params as any).deviceId }, {
        identityId: req.identity.id,
        tenantId: null,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return { success: true, data: result };
    },
  );
}
