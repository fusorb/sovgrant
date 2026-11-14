// src/modules/tenant/flows/accept-invite.flow.ts
import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { EmailTokenService } from "@/modules/auth/services/email-token.service";

export const AcceptInviteInputSchema = z.object({
  token: z.string().min(1),
});

export const AcceptInviteOutputSchema = z.union([
  z.object({ kind: z.literal("expired") }),
  z.object({ kind: z.literal("already_active"), tenantSlug: z.string() }),
  z.object({ kind: z.literal("not_found") }),
  z.object({ kind: z.literal("joined"), message: z.string(), tenantSlug: z.string() }),
]);

type Input = z.infer<typeof AcceptInviteInputSchema>;
type Output = z.infer<typeof AcceptInviteOutputSchema>;

export const acceptInviteFlow: Flow<Input, Output> = {
  name: "tenant:accept-invite",
  inputSchema: AcceptInviteInputSchema,
  outputSchema: AcceptInviteOutputSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    const emailTokenService = new EmailTokenService(ctx.db);

    let tokenRecord: Awaited<ReturnType<EmailTokenService["consume"]>>;
    try {
      tokenRecord = await emailTokenService.consume(input.token, "TENANT_INVITE");
    } catch {
      return { kind: "expired" };
    }

    const whereClause = tokenRecord.tenantId
      ? {
          identityId: tokenRecord.identityId,
          tenantId: tokenRecord.tenantId,
          status: "PENDING" as const,
        }
      : { identityId: tokenRecord.identityId, status: "PENDING" as const };

    const membership = await ctx.db.tenantMembership.findFirst({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { name: true, slug: true } } },
    });

    if (!membership) {
      const active = await ctx.db.tenantMembership.findFirst({
        where: {
          identityId: tokenRecord.identityId,
          ...(tokenRecord.tenantId ? { tenantId: tokenRecord.tenantId } : {}),
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
        include: { tenant: { select: { slug: true } } },
      });

      if (active) {
        return { kind: "already_active", tenantSlug: active.tenant.slug };
      }

      return { kind: "not_found" };
    }

    await ctx.db.tenantMembership.update({
      where: { id: membership.id },
      data: { status: "ACTIVE" },
    });

    return {
      kind: "joined",
      message: `You have joined ${membership.tenant.name}`,
      tenantSlug: membership.tenant.slug,
    };
  },
};
