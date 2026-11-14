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
  /**
   * The requesting session's server-captured context, so the approver can see
   * who/where a sign-in is coming from. Present only while pending, and only
   * to a session of the same identity (see the note in execute()).
   */
  requester: z
    .object({
      ip: z.string().nullable(),
      userAgent: z.string().nullable(),
      email: z.string().nullable(),
    })
    .optional(),
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
      select: {
        id: true,
        identityId: true,
        status: true,
        pairedDeviceId: true,
        expiresAt: true,
        ip: true,
        userAgent: true,
        identity: { select: { primaryEmail: true } },
      },
    });
    if (!approval) throw ApiError.notFound("Approval request not found");

    if (approval.status !== "pending") {
      return { status: approval.status as any, pairedDeviceId: approval.pairedDeviceId };
    }
    if (approval.expiresAt < new Date()) {
      await ctx.db.deviceApproval.update({ where: { id: approval.id }, data: { status: "expired" } });
      return { status: "expired" };
    }

    // The requester's browsing context is only disclosed to an authenticated
    // session of the SAME identity - the approver. A challenge string alone
    // (or another account's token) must not reveal where the sign-in came
    // from; those callers still get the status, just without the context.
    const isOwningSession = !!ctx.identityId && ctx.identityId === approval.identityId;
    if (!isOwningSession) return { status: "pending" };

    return {
      status: "pending",
      requester: {
        ip: approval.ip,
        userAgent: approval.userAgent,
        email: approval.identity?.primaryEmail ?? null,
      },
    };
  },
};
