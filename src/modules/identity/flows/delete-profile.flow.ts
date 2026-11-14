import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { auditService } from "@/modules/audit/services/audit.service";
import { blockJtiBestEffort } from "@/lib/security/revoke-access-token";

export const deleteProfileFlow: Flow<undefined, void> = {
  name: "identity:delete-profile",
  inputSchema: z.undefined(),

  async execute(_input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const identityId = ctx.identityId;

    const identity = await ctx.db.identity.findUniqueOrThrow({
      where: { id: identityId },
      select: { primaryEmail: true, name: true },
    });

    // Revoke all live sessions and tokens — must blocklist JTIs in
    // revokedJti table + Redis so the auth guard rejects them immediately.
    const liveTokens = await ctx.db.accessToken.findMany({
      where: { identityId, revoked: false, jti: { not: null } },
      select: { jti: true, expiresAt: true },
    });

    await ctx.db.$transaction([
      ctx.db.session.updateMany({
        where: { identityId, valid: true },
        data: { valid: false },
      }),
      ctx.db.accessToken.updateMany({
        where: { identityId, revoked: false },
        data: { revoked: true },
      }),
      ctx.db.refreshToken.updateMany({
        where: { identityId, revoked: false },
        data: { revoked: true },
      }),
      ...liveTokens.map((t) =>
        ctx.db.revokedJti.create({
          data: { jti: t.jti!, expiresAt: t.expiresAt },
        }),
      ),
    ]);

    // Redis blocklist fast-path - the durable revokedJti rows were written
    // in the transaction above, so this is best-effort only.
    for (const t of liveTokens) {
      blockJtiBestEffort(t.jti!, t.expiresAt);
    }

    await ctx.db.identity.delete({ where: { id: identityId } });

    void auditService
      .log({
        action: "USER_DELETED",
        identityId,
        ip: ctx.ip,
        metadata: { email: identity.primaryEmail },
      })
      .catch(() => {});
  },
};
