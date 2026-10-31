import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";

const RevokePairedDeviceInputSchema = z.object({
  deviceId: z.string().min(1),
});

const RevokePairedDeviceOutputSchema = z.object({
  revoked: z.boolean(),
});

export const revokePairedDeviceFlow: Flow<
  z.infer<typeof RevokePairedDeviceInputSchema>,
  z.infer<typeof RevokePairedDeviceOutputSchema>
> = {
  name: "identity:revoke-paired-device",
  inputSchema: RevokePairedDeviceInputSchema,
  outputSchema: RevokePairedDeviceOutputSchema,
  async execute(input, ctx: FlowContext) {
    const identityId = ctx.identityId;
    if (!identityId) throw ApiError.unauthorized("Authentication required");

    const device = await ctx.db.pairedDevice.findUnique({
      where: { deviceId: input.deviceId },
    });
    if (!device || device.identityId !== identityId) throw ApiError.notFound("Paired device not found");

    await ctx.db.pairedDevice.update({
      where: { id: device.id },
      data: { revokedAt: new Date(), trusted: false },
    });
    return { revoked: true };
  },
};
