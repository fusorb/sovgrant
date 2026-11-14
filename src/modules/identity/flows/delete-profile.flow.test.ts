import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/audit/services/audit.service", () => ({
  auditService: { log: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/security/revoke-access-token", () => ({
  blockJtiBestEffort: vi.fn(),
}));

import { deleteProfileFlow } from "./delete-profile.flow";
import { createMockFlowCtx } from "@/test-utils/mock-db";
import { auditService } from "@/modules/audit/services/audit.service";
import { blockJtiBestEffort } from "@/lib/security/revoke-access-token";

describe("deleteProfileFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 401 when not authenticated", async () => {
    const ctx = createMockFlowCtx({ identityId: undefined });
    await expect(deleteProfileFlow.execute(undefined, ctx)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("revokes sessions/tokens, blocklists JTIs, deletes identity, and audits", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const ctx = createMockFlowCtx({ identityId: "id-1", ip: "1.2.3.4" });
    ctx.db.identity.findUniqueOrThrow.mockResolvedValue({
      primaryEmail: "a@example.com",
      name: "A",
    });
    ctx.db.accessToken.findMany.mockResolvedValue([
      { jti: "jti-1", expiresAt },
    ]);
    ctx.db.$transaction = vi.fn(async (ops: any[]) => Promise.all(ops));
    ctx.db.session.updateMany.mockResolvedValue({ count: 1 });
    ctx.db.accessToken.updateMany.mockResolvedValue({ count: 1 });
    ctx.db.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    ctx.db.revokedJti.create.mockResolvedValue({});
    ctx.db.identity.delete.mockResolvedValue({});

    await deleteProfileFlow.execute(undefined, ctx);

    expect(ctx.db.session.updateMany).toHaveBeenCalledWith({
      where: { identityId: "id-1", valid: true },
      data: { valid: false },
    });
    expect(ctx.db.accessToken.updateMany).toHaveBeenCalledWith({
      where: { identityId: "id-1", revoked: false },
      data: { revoked: true },
    });
    expect(ctx.db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { identityId: "id-1", revoked: false },
      data: { revoked: true },
    });
    expect(ctx.db.revokedJti.create).toHaveBeenCalledWith({
      data: { jti: "jti-1", expiresAt },
    });
    expect(ctx.db.$transaction).toHaveBeenCalled();
    expect(blockJtiBestEffort).toHaveBeenCalledWith("jti-1", expiresAt);
    expect(ctx.db.identity.delete).toHaveBeenCalledWith({ where: { id: "id-1" } });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "USER_DELETED",
        identityId: "id-1",
        ip: "1.2.3.4",
        metadata: { email: "a@example.com" },
      }),
    );
  });
});
