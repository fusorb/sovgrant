import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";
import { verifyEd25519Signature } from "@/lib/crypto";

const ApproveDeviceApprovalInputSchema = z.object({
  challenge: z.string().min(1),
  deviceId: z.string().min(1),
  signature: z.string().min(1),
});

const ApproveDeviceApprovalOutputSchema = z.object({
  success: z.boolean(),
});

export const approveDeviceApprovalFlow: Flow<
  z.infer<typeof ApproveDeviceApprovalInputSchema>,
  z.infer<typeof ApproveDeviceApprovalOutputSchema>
> = {
  name: "identity:approve-device-approval",
  inputSchema: ApproveDeviceApprovalInputSchema,
  outputSchema: ApproveDeviceApprovalOutputSchema,
  async execute(input, ctx: FlowContext) {
    const identityId = ctx.identityId;
    if (!identityId) throw ApiError.unauthorized("Authentication required");

    const approval = await ctx.db.deviceApproval.findUnique({
      where: { challenge: input.challenge },
    });
    if (!approval) throw ApiError.notFound("Approval request not found");
    if (approval.identityId !== identityId) throw ApiError.forbidden("Not authorized to approve this request");
    if (approval.status !== "pending") throw ApiError.badRequest("Approval already processed");
    if (approval.expiresAt < new Date()) {
      await ctx.db.deviceApproval.update({ where: { id: approval.id }, data: { status: "expired" } });
      throw ApiError.badRequest("Approval request expired");
    }

    // Proof-of-possession: the approving device must sign the challenge with the
    // private key matching the public key it registered at pairing time.
    const device = await ctx.db.pairedDevice.findFirst({
      where: { identityId, deviceId: input.deviceId, revokedAt: null, trusted: true },
    });
    if (!device) throw ApiError.forbidden("Unknown or untrusted device");
    if (!verifyEd25519Signature(device.publicKey, input.challenge, input.signature)) {
      throw ApiError.forbidden("Invalid device signature");
    }

    await ctx.db.deviceApproval.update({
      where: { id: approval.id },
      data: { status: "approved", approvedAt: new Date(), pairedDeviceId: device.id },
    });
    await ctx.db.pairedDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    return { success: true };
  },
};
