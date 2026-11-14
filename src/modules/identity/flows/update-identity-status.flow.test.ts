import { describe, it, expect, vi, beforeEach } from "vitest";

const sendAccountSuspended = vi.fn().mockResolvedValue(undefined);
vi.mock("@/modules/audit/services/audit.service", () => ({
  auditService: { log: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/security/jti-blocklist", () => ({
  blockJti: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/notifications/notification.service", () => ({
  notificationService: { sendAccountSuspended },
}));

import { updateIdentityStatusFlow } from "./update-identity-status.flow";
import { createMockFlowCtx } from "@/test-utils/mock-db";
import { auditService } from "@/modules/audit/services/audit.service";
import { blockJti } from "@/lib/security/jti-blocklist";

describe("updateIdentityStatusFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupCtx() {
    const ctx = createMockFlowCtx({ identityId: "admin-1", ip: "1.2.3.4", requestId: "req-1" });
    ctx.db.$transaction = vi.fn(async (ops: any[]) => Promise.all(ops));
    ctx.db.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    ctx.db.session.updateMany.mockResolvedValue({ count: 1 });
    ctx.db.accessToken.updateMany.mockResolvedValue({ count: 1 });
    ctx.db.revokedJti.create.mockResolvedValue({});
    return ctx;
  }

  it("reinstates ACTIVE without revocation or status audit", async () => {
    const ctx = setupCtx();
    ctx.db.identity.update.mockResolvedValue({ primaryEmail: "a@example.com", name: "A" });

    await updateIdentityStatusFlow.execute({ id: "id-1", status: "ACTIVE" }, ctx);

    expect(ctx.db.accessToken.findMany).not.toHaveBeenCalled();
    expect(ctx.db.$transaction).not.toHaveBeenCalled();
    expect(blockJti).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "SESSION_REVOKED_ALL" }),
    );
    expect(auditService.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "IDENTITY_SUSPENDED" }),
    );
    expect(auditService.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "IDENTITY_BANNED" }),
    );
    expect(sendAccountSuspended).not.toHaveBeenCalled();
  });

  it("suspends: revokes, blocklists with TTL, audits SESSION_REVOKED_ALL+IDENTITY_SUSPENDED, notifies", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const expiresAt = new Date("2026-01-01T00:00:45Z"); // 45s
    const ctx = setupCtx();
    ctx.db.identity.update.mockResolvedValue({ primaryEmail: "a@example.com", name: "A" });
    ctx.db.accessToken.findMany.mockResolvedValue([{ jti: "jti-1", expiresAt }]);

    await updateIdentityStatusFlow.execute(
      { id: "id-1", status: "SUSPENDED", reason: "r" },
      ctx,
    );

    expect(ctx.db.revokedJti.create).toHaveBeenCalledWith({
      data: { jti: "jti-1", expiresAt },
    });
    expect(blockJti).toHaveBeenCalledWith("jti-1", 45);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SESSION_REVOKED_ALL",
        identityId: "id-1",
        requestId: "req-1",
        metadata: { reason: "account_suspended" },
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "IDENTITY_SUSPENDED",
        identityId: "id-1",
        metadata: { status: "SUSPENDED", reason: "r" },
      }),
    );
    expect(sendAccountSuspended).toHaveBeenCalledWith("a@example.com", {
      name: "A",
      reason: "r",
    });
    vi.useRealTimers();
  });

  it("bans: revokes and audits IDENTITY_BANNED without suspension email", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const expiresAt = new Date("2026-01-01T00:00:30Z");
    const ctx = setupCtx();
    ctx.db.identity.update.mockResolvedValue({ primaryEmail: "a@example.com", name: "A" });
    ctx.db.accessToken.findMany.mockResolvedValue([{ jti: "jti-1", expiresAt }]);

    await updateIdentityStatusFlow.execute(
      { id: "id-1", status: "BANNED", reason: "x" },
      ctx,
    );

    expect(ctx.db.revokedJti.create).toHaveBeenCalledWith({
      data: { jti: "jti-1", expiresAt },
    });
    expect(blockJti).toHaveBeenCalledWith("jti-1", 30);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SESSION_REVOKED_ALL",
        metadata: { reason: "account_banned" },
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "IDENTITY_BANNED",
        metadata: { status: "BANNED", reason: "x" },
      }),
    );
    expect(sendAccountSuspended).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
