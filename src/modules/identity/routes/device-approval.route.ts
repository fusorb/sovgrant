import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import { createDeviceApprovalFlow } from "../flows/create-device-approval.flow";
import { pollDeviceApprovalFlow } from "../flows/poll-device-approval.flow";
import { approveDeviceApprovalFlow } from "../flows/approve-device-approval.flow";
import { rejectDeviceApprovalFlow } from "../flows/reject-device-approval.flow";

export async function deviceApprovalRoute(fastify: FastifyInstance) {
  const withZod = fastify.withTypeProvider<ZodTypeProvider>();

  withZod.post(
    "/device-approvals",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["SovPort Integration"],
        summary: "Create a device approval challenge",
        security: [{ bearerAuth: [] }],
        body: z.object({
          type: z.enum(["login", "mfa", "step-up"]).optional(),
          context: z.record(z.any()).optional(),
        }),
        response: {
          201: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req, reply) => {
      const result = await flowExecutor.run(createDeviceApprovalFlow, req.body, {
        identityId: req.identity.id,
        tenantId: null,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return reply.status(201).send({ success: true, data: result });
    },
  );

  withZod.get(
    "/device-approvals/:challenge",
    {
      schema: {
        tags: ["SovPort Integration"],
        summary: "Poll device approval status",
        params: z.object({ challenge: z.string() }),
        response: {
          200: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req) => {
      const result = await flowExecutor.run(pollDeviceApprovalFlow, { challenge: (req.params as any).challenge }, {
        identityId: null,
        tenantId: null,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return { success: true, data: result };
    },
  );

  withZod.post(
    "/device-approvals/:challenge/approve",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["SovPort Integration"],
        summary: "Approve a device approval challenge",
        security: [{ bearerAuth: [] }],
        params: z.object({ challenge: z.string() }),
        body: z.object({ signature: z.string().optional() }).optional(),
        response: {
          200: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req) => {
      const result = await flowExecutor.run(approveDeviceApprovalFlow, { challenge: (req.params as any).challenge, ...(req.body as any) }, {
        identityId: req.identity.id,
        tenantId: null,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return { success: true, data: result };
    },
  );

  withZod.post(
    "/device-approvals/:challenge/reject",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["SovPort Integration"],
        summary: "Reject a device approval challenge",
        security: [{ bearerAuth: [] }],
        params: z.object({ challenge: z.string() }),
        response: {
          200: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req) => {
      const result = await flowExecutor.run(rejectDeviceApprovalFlow, { challenge: (req.params as any).challenge }, {
        identityId: req.identity.id,
        tenantId: null,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return { success: true, data: result };
    },
  );
}
