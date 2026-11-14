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

import { suspendIdentityFlow } from "./suspend-identity.flow";
import { createMockFlowCtx } from "@/test-utils/mock-db";
import { auditService } from "@/modules/audit/services/audit.service";
import { blockJti } from "@/lib/security/jti-blocklist";

describe("suspendIdentityFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("suspends, revokes sessions/tokens with revokedJti+blockJti, audits, and notifies", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const expiresAt = new Date("2026-01-01T00:01:00Z"); // 60s
    const ctx = createMockFlowCtx({
      identityId: "admin-1",
      ip: "1.2.3.4",
      requestId: "req-1",
    });
    ctx.db.identity.update.mockResolvedValue({
      primaryEmail: "a@example.com",
      name: "Alice",
    });
    ctx.db.accessToken.findMany.mockResolvedValue([{ jti: "jti-1", expiresAt }]);
    ctx.db.$transaction = vi.fn(async (ops: any[]) => Promise.all(ops));
    ctx.db.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    ctx.db.session.updateMany.mockResolvedValue({ count: 1 });
    ctx.db.accessToken.updateMany.mockResolvedValue({ count: 1 });
    ctx.db.revokedJti.create.mockResolvedValue({});

    await suspendIdentityFlow.execute({ id: "id-1", reason: "abuse" }, ctx);

    expect(ctx.db.identity.update).toHaveBeenCalledWith({
      where: { id: "id-1" },
      data: { status: "SUSPENDED" },
      select: { primaryEmail: true, name: true },
    });
    expect(ctx.db.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { identityId: "id-1", revoked: false },
        data: expect.objectContaining({ revoked: true }),
      }),
    );
    expect(ctx.db.session.updateMany).toHaveBeenCalledWith({
      where: { identityId: "id-1", valid: true },
      data: { valid: false },
    });
    expect(ctx.db.accessToken.updateMany).toHaveBeenCalledWith({
      where: { identityId: "id-1", revoked: false },
      data: { revoked: true },
    });
    expect(ctx.db.revokedJti.create).toHaveBeenCalledWith({
      data: { jti: "jti-1", expiresAt },
    });
    expect(blockJti).toHaveBeenCalledWith("jti-1", 60);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SESSION_REVOKED_ALL",
        identityId: "id-1",
        ip: "1.2.3.4",
        requestId: "req-1",
        metadata: { reason: "account_suspended" },
      }),
    );
    expect(sendAccountSuspended).toHaveBeenCalledWith("a@example.com", {
      name: "Alice",
      reason: "abuse",
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "IDENTITY_SUSPENDED",
        identityId: "id-1",
        requestId: "req-1",
        metadata: { reason: "abuse" },
      }),
    );
    vi.useRealTimers();
  });
});
