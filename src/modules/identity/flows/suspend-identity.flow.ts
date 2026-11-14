import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { auditService } from "@/modules/audit/services/audit.service";
import { blockJti } from "@/lib/security/jti-blocklist";

const Input = z.object({
  id: z.string(),
  reason: z.string().optional(),
});

async function revokeAllSessions(db: any, identityId: string): Promise<void> {
  const liveTokens = await db.accessToken.findMany({
    where: { identityId, revoked: false, jti: { not: null } },
    select: { jti: true, expiresAt: true },
  });

  await db.$transaction([
    db.refreshToken.updateMany({
      where: { identityId, revoked: false },
      data: { revoked: true, rotatedAt: new Date() },
    }),
    db.session.updateMany({
      where: { identityId, valid: true },
      data: { valid: false },
    }),
    db.accessToken.updateMany({
      where: { identityId, revoked: false },
      data: { revoked: true },
    }),
    ...liveTokens.map((t: { jti: string | null; expiresAt: Date }) =>
      db.revokedJti.create({
        data: { jti: t.jti!, expiresAt: t.expiresAt },
      }),
    ),
  ]);

  for (const t of liveTokens) {
    const remainingTtlMs = t.expiresAt.getTime() - Date.now();
    const remainingTtlSec = Math.max(Math.ceil(remainingTtlMs / 1000), 1);
    void blockJti(t.jti!, remainingTtlSec).catch(() => {});
  }
}

export const suspendIdentityFlow: Flow<z.infer<typeof Input>, void> = {
  name: "identity:suspend-identity",
  inputSchema: Input,

  async execute(input, ctx: FlowContext) {
    const { id, reason } = input;

    const identity = await ctx.db.identity.update({
      where: { id },
      data: { status: "SUSPENDED" },
      select: { primaryEmail: true, name: true },
    });

    await revokeAllSessions(ctx.db, id);

    await auditService.log({
      action: "SESSION_REVOKED_ALL",
      identityId: id,
      ip: ctx.ip ?? "0.0.0.0",
      requestId: ctx.requestId,
      metadata: { reason: "account_suspended" },
    });

    if (identity.primaryEmail) {
      const { notificationService } =
        await import("@/lib/notifications/notification.service");
      void notificationService
        .sendAccountSuspended(identity.primaryEmail, {
          name: identity.name ?? undefined,
          reason,
        })
        .catch(() => {});
    }
    await auditService.log({
      action: "IDENTITY_SUSPENDED",
      identityId: id,
      ip: ctx.ip ?? "0.0.0.0",
      requestId: ctx.requestId,
      metadata: { reason },
    });
  },
};
