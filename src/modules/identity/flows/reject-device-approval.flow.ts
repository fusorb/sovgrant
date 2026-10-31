import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";

const RejectDeviceApprovalInputSchema = z.object({
  challenge: z.string().min(1),
});

const RejectDeviceApprovalOutputSchema = z.object({
  success: z.boolean(),
});

export const rejectDeviceApprovalFlow: Flow<
  z.infer<typeof RejectDeviceApprovalInputSchema>,
  z.infer<typeof RejectDeviceApprovalOutputSchema>
> = {
  name: "identity:reject-device-approval",
  inputSchema: RejectDeviceApprovalInputSchema,
  outputSchema: RejectDeviceApprovalOutputSchema,
  async execute(input, ctx: FlowContext) {
    const identityId = ctx.identityId;
    if (!identityId) throw ApiError.unauthorized("Authentication required");

    const approval = await ctx.db.deviceApproval.findUnique({
      where: { challenge: input.challenge },
    });
    if (!approval) throw ApiError.notFound("Approval request not found");
    if (approval.identityId !== identityId) throw ApiError.forbidden("Not authorized to reject this request");
    if (approval.status !== "pending") throw ApiError.badRequest("Approval already processed");
    if (approval.expiresAt < new Date()) {
      await ctx.db.deviceApproval.update({ where: { id: approval.id }, data: { status: "expired" } });
      throw ApiError.badRequest("Approval request expired");
    }

    await ctx.db.deviceApproval.update({
      where: { id: approval.id },
      data: { status: "rejected", rejectedAt: new Date() },
    });
    return { success: true };
  },
};
