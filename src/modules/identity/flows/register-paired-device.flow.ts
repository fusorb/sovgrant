import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";

const RegisterPairedDeviceInputSchema = z.object({
  deviceId: z.string().min(1).max(128),
  publicKey: z.string().min(1).max(2048),
  name: z.string().max(128).optional(),
  platform: z.string().max(32).optional(),
});

const RegisterPairedDeviceOutputSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
});

export const registerPairedDeviceFlow: Flow<
  z.infer<typeof RegisterPairedDeviceInputSchema>,
  z.infer<typeof RegisterPairedDeviceOutputSchema>
> = {
  name: "identity:register-paired-device",
  inputSchema: RegisterPairedDeviceInputSchema,
  outputSchema: RegisterPairedDeviceOutputSchema,
  async execute(input, ctx: FlowContext) {
    const identityId = ctx.identityId;
    if (!identityId) throw ApiError.unauthorized("Authentication required");

    const existing = await ctx.db.pairedDevice.findUnique({
      where: { deviceId: input.deviceId },
    });
    if (existing) {
      if (existing.identityId !== identityId) throw ApiError.conflict("Device already paired to another account");
      await ctx.db.pairedDevice.update({
        where: { id: existing.id },
        data: { publicKey: input.publicKey, lastSeenAt: new Date(), revokedAt: null, trusted: true },
      });
      return { id: existing.id, deviceId: existing.deviceId };
    }

    const device = await ctx.db.pairedDevice.create({
      data: {
        identityId,
        deviceId: input.deviceId,
        publicKey: input.publicKey,
        name: input.name,
        platform: input.platform,
      },
    });
    return { id: device.id, deviceId: device.deviceId };
  },
};
