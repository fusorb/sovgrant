// src/modules/tenant/flows/list-members.flow.ts
import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";
import { presentMembershipWithIdentity } from "../presenters/membership.presenter";

export const ListMembersInputSchema = z.object({
  tenantId: z.string().cuid(),
});

export const ListMembersOutputSchema = z.array(z.any());

type Input = z.infer<typeof ListMembersInputSchema>;
type Output = z.infer<typeof ListMembersOutputSchema>;

export const listMembersFlow: Flow<Input, Output> = {
  name: "tenant:list-members",
  inputSchema: ListMembersInputSchema,
  outputSchema: ListMembersOutputSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    if (!ctx.identityId) throw ApiError.unauthorized();

    // Caller must be ACTIVE member of this tenant, or ACTIVE member of SYSTEM (platform admin).
    // 403 (not 404): caller already knows tenantId from their own tenant context.
    const membership = await ctx.db.tenantMembership.findFirst({
      where: {
        identityId: ctx.identityId,
        tenantId: { in: [input.tenantId, "SYSTEM"] },
        status: "ACTIVE",
      },
    });
    if (!membership) {
      throw ApiError.forbidden("You are not a member of this tenant");
    }

    const memberships = await ctx.db.tenantMembership.findMany({
      where: { tenantId: input.tenantId },
      include: {
        role: { select: { name: true } },
        identity: {
          select: { id: true, primaryEmail: true, name: true, picture: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map(presentMembershipWithIdentity);
  },
};
