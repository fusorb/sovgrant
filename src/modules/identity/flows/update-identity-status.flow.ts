import { z } from "zod";
import type { AuditLogAction } from "@prisma-client";
import type { Flow, FlowContext } from "@/core/flows";
import { auditService } from "@/modules/audit/services/audit.service";
import { blockJti } from "@/lib/security/jti-blocklist";

const Input = z.object({
  id: z.string(),
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]),
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

function statusToAuditAction(status: string): AuditLogAction | null {
  switch (status) {
    case "SUSPENDED":
      return "IDENTITY_SUSPENDED";
    case "BANNED":
      return "IDENTITY_BANNED";
    default:
      return null;
  }
}

export const updateIdentityStatusFlow: Flow<z.infer<typeof Input>, void> = {
  name: "identity:update-identity-status",
  inputSchema: Input,

  async execute(input, ctx: FlowContext) {
    const { id, status, reason } = input;

    const identity = await ctx.db.identity.update({
      where: { id },
      data: { status },
      select: { primaryEmail: true, name: true },
    });

    if (status === "SUSPENDED" || status === "BANNED") {
      await revokeAllSessions(ctx.db, id);

      await auditService.log({
        action: "SESSION_REVOKED_ALL",
        identityId: id,
        ip: ctx.ip ?? "0.0.0.0",
        requestId: ctx.requestId,
        metadata: { reason: `account_${status.toLowerCase()}` },
      });
    }

    if (status === "SUSPENDED" && identity.primaryEmail) {
      const { notificationService } =
        await import("@/lib/notifications/notification.service");
      void notificationService
        .sendAccountSuspended(identity.primaryEmail, {
          name: identity.name ?? undefined,
          reason,
        })
        .catch(() => {});
    }

    const auditAction = statusToAuditAction(status);
    if (auditAction) {
      await auditService.log({
        action: auditAction,
        identityId: id,
        ip: ctx.ip ?? "0.0.0.0",
        requestId: ctx.requestId,
        metadata: { status, reason },
      });
    }
  },
};
