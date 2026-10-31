import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";
import { randomBytes } from "crypto";

const CreateDeviceApprovalInputSchema = z.object({
  type: z.enum(["login", "mfa", "step-up"]).default("login"),
  context: z.any().optional(),
});

const CreateDeviceApprovalOutputSchema = z.object({
  challenge: z.string(),
  expiresAt: z.date(),
  pairedDevices: z.array(z.object({ deviceId: z.string(), name: z.string().nullable(), platform: z.string().nullable() })),
});

export const createDeviceApprovalFlow: Flow<
  z.infer<typeof CreateDeviceApprovalInputSchema>,
  z.infer<typeof CreateDeviceApprovalOutputSchema>
> = {
  name: "identity:create-device-approval",
  inputSchema: CreateDeviceApprovalInputSchema,
  outputSchema: CreateDeviceApprovalOutputSchema,
  async execute(input, ctx: FlowContext) {
    const identityId = ctx.identityId;
    if (!identityId) throw ApiError.unauthorized("Authentication required");

    const devices = await ctx.db.pairedDevice.findMany({
      where: { identityId, revokedAt: null, trusted: true },
      select: { deviceId: true, name: true, platform: true },
    });
    if (devices.length === 0) throw ApiError.badRequest("No paired SovPort devices available");

    const challenge = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await ctx.db.deviceApproval.create({
      data: {
        identityId,
        challenge,
        type: input.type,
        context: (input.context ?? {}) as any,
        expiresAt,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });

    return { challenge, expiresAt, pairedDevices: devices };
  },
};
