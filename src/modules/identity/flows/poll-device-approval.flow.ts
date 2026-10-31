import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";

const PollDeviceApprovalInputSchema = z.object({
  challenge: z.string().min(1),
});

const PollDeviceApprovalOutputSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "expired"]),
  pairedDeviceId: z.string().nullable().optional(),
});

export const pollDeviceApprovalFlow: Flow<
  z.infer<typeof PollDeviceApprovalInputSchema>,
  z.infer<typeof PollDeviceApprovalOutputSchema>
> = {
  name: "identity:poll-device-approval",
  inputSchema: PollDeviceApprovalInputSchema,
  outputSchema: PollDeviceApprovalOutputSchema,
  async execute(input, ctx: FlowContext) {
    const approval = await ctx.db.deviceApproval.findUnique({
      where: { challenge: input.challenge },
    });
    if (!approval) throw ApiError.notFound("Approval request not found");

    if (approval.status !== "pending") {
      return { status: approval.status as any, pairedDeviceId: approval.pairedDeviceId };
    }
    if (approval.expiresAt < new Date()) {
      await ctx.db.deviceApproval.update({ where: { id: approval.id }, data: { status: "expired" } });
      return { status: "expired" };
    }
    return { status: "pending" };
  },
};
