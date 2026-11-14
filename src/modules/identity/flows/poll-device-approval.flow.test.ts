// src/modules/identity/flows/poll-device-approval.flow.test.ts
//
// Proves the poll flow discloses the requesting session's context only to the
// owning identity's own authenticated sessions, and only while pending:
//   - pending + same identity   -> { status, requester: { ip, userAgent, email } }
//   - pending + other identity  -> { status } only (no requester)
//   - pending + no auth         -> { status } only (defensive)
//   - pending + no primaryEmail -> requester with email: null
//   - approved                  -> { status, pairedDeviceId }, no requester
//   - expired                   -> marks the row expired, { status: "expired" }
//   - unknown challenge         -> 404

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@prisma-client", () => ({
  UserStatus: {},
  MfaType: {},
  Prisma: { DbNull: null, JsonNull: null, AnyNull: null },
}));

import { pollDeviceApprovalFlow } from "./poll-device-approval.flow";
import { createMockFlowCtx } from "@/test-utils/mock-db";

const IDENTITY_ID = "identity-1";
const CHALLENGE = "challenge-abc";

function approvalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "approval-1",
    identityId: IDENTITY_ID,
    status: "pending",
    pairedDeviceId: null,
    expiresAt: new Date(Date.now() + 60_000),
    ip: "203.0.113.7",
    userAgent: "SovPort/1.2 (iPhone)",
    identity: { primaryEmail: "owner@example.com" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pollDeviceApprovalFlow", () => {
  it("returns the requester context to a session of the owning identity", async () => {
    const ctx = createMockFlowCtx({ identityId: IDENTITY_ID });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(approvalRow());

    const result = await pollDeviceApprovalFlow.execute({ challenge: CHALLENGE }, ctx);

    expect(result).toEqual({
      status: "pending",
      requester: {
        ip: "203.0.113.7",
        userAgent: "SovPort/1.2 (iPhone)",
        email: "owner@example.com",
      },
    });
  });

  it("withholds the requester context from another identity's session", async () => {
    const ctx = createMockFlowCtx({ identityId: "someone-else" });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(approvalRow());

    const result = await pollDeviceApprovalFlow.execute({ challenge: CHALLENGE }, ctx);

    expect(result).not.toHaveProperty("requester");
    expect(result).toEqual({ status: "pending" });
  });

  it("withholds the requester context without authentication", async () => {
    const ctx = createMockFlowCtx(); // identityId undefined
    ctx.db.deviceApproval.findUnique.mockResolvedValue(approvalRow());

    const result = await pollDeviceApprovalFlow.execute({ challenge: CHALLENGE }, ctx);

    expect(result).not.toHaveProperty("requester");
    expect(result).toEqual({ status: "pending" });
  });

  it("returns the context with a null email when the identity has no primaryEmail", async () => {
    const ctx = createMockFlowCtx({ identityId: IDENTITY_ID });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(
      approvalRow({ identity: { primaryEmail: null } }),
    );

    const result = await pollDeviceApprovalFlow.execute({ challenge: CHALLENGE }, ctx);

    expect(result.status).toBe("pending");
    expect(result.requester).toEqual({
      ip: "203.0.113.7",
      userAgent: "SovPort/1.2 (iPhone)",
      email: null,
    });
  });

  it("returns the decided status and pairedDeviceId without context", async () => {
    const ctx = createMockFlowCtx({ identityId: IDENTITY_ID });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(
      approvalRow({ status: "approved", pairedDeviceId: "pd-9" }),
    );

    const result = await pollDeviceApprovalFlow.execute({ challenge: CHALLENGE }, ctx);

    expect(result).not.toHaveProperty("requester");
    expect(result).toEqual({ status: "approved", pairedDeviceId: "pd-9" });
  });

  it("expires a stale pending request and reports it", async () => {
    const ctx = createMockFlowCtx({ identityId: IDENTITY_ID });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(
      approvalRow({ expiresAt: new Date(Date.now() - 1000) }),
    );
    ctx.db.deviceApproval.update.mockResolvedValue({});

    const result = await pollDeviceApprovalFlow.execute({ challenge: CHALLENGE }, ctx);

    expect(result).toEqual({ status: "expired" });
    expect(ctx.db.deviceApproval.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "approval-1" },
        data: { status: "expired" },
      }),
    );
  });

  it("throws 404 for an unknown challenge", async () => {
    const ctx = createMockFlowCtx({ identityId: IDENTITY_ID });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(null);

    await expect(
      pollDeviceApprovalFlow.execute({ challenge: "no-such-challenge" }, ctx),
    ).rejects.toMatchObject({ statusCode: 404, message: /not found/i });
  });
});
