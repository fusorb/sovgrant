// src/modules/identity/flows/approve-device-approval.flow.test.ts
//
// Proves the approve-device-approval flow enforces proof-of-possession:
//   - Approves when the device signs the challenge with its registered key
//   - Throws 403 on an invalid signature
//   - Throws 403 for an unknown / untrusted device
//   - Throws 403 when approving another identity's request
//   - Throws 400 when the request has expired
//   - Throws 401 without authentication

import { vi, describe, it, expect, beforeEach } from "vitest";
import { generateKeyPairSync, sign as cryptoSign } from "crypto";

vi.mock("@prisma-client", () => ({
  UserStatus: {},
  MfaType: {},
  Prisma: { DbNull: null, JsonNull: null, AnyNull: null },
}));

import { approveDeviceApprovalFlow } from "./approve-device-approval.flow";
import { createMockFlowCtx } from "@/test-utils/mock-db";

const IDENTITY_ID = "identity-1";
const CHALLENGE = "challenge-abc";
const DEVICE_ID = "device-1";
const PAIRED_DEVICE_ROW_ID = "pd-1";

// A real Ed25519 keypair, matching how SovPort registers a paired device
// (base64url raw 32-byte public key) and signs the challenge.
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PUBLIC_KEY_B64U = (publicKey.export({ format: "jwk" }) as { x: string }).x;

function signChallenge(challenge: string): string {
  return cryptoSign(null, Buffer.from(challenge, "utf8"), privateKey).toString("base64url");
}

function pendingApproval(overrides: Record<string, unknown> = {}) {
  return {
    id: "approval-1",
    identityId: IDENTITY_ID,
    challenge: CHALLENGE,
    status: "pending",
    expiresAt: new Date(Date.now() + 60_000),
    pairedDeviceId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("approveDeviceApprovalFlow", () => {
  it("approves when the device signs the challenge with its registered key", async () => {
    const ctx = createMockFlowCtx({ identityId: IDENTITY_ID });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(pendingApproval());
    ctx.db.pairedDevice.findFirst.mockResolvedValue({
      id: PAIRED_DEVICE_ROW_ID,
      deviceId: DEVICE_ID,
      publicKey: PUBLIC_KEY_B64U,
    });
    ctx.db.deviceApproval.update.mockResolvedValue({});
    ctx.db.pairedDevice.update.mockResolvedValue({});

    const result = await approveDeviceApprovalFlow.execute(
      { challenge: CHALLENGE, deviceId: DEVICE_ID, signature: signChallenge(CHALLENGE) },
      ctx,
    );

    expect(result).toEqual({ success: true });
    expect(ctx.db.deviceApproval.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "approved", pairedDeviceId: PAIRED_DEVICE_ROW_ID }),
      }),
    );
    expect(ctx.db.pairedDevice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { identityId: IDENTITY_ID, deviceId: DEVICE_ID, revokedAt: null, trusted: true },
      }),
    );
  });

  it("throws 403 when the signature is invalid", async () => {
    const ctx = createMockFlowCtx({ identityId: IDENTITY_ID });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(pendingApproval());
    ctx.db.pairedDevice.findFirst.mockResolvedValue({
      id: PAIRED_DEVICE_ROW_ID,
      deviceId: DEVICE_ID,
      publicKey: PUBLIC_KEY_B64U,
    });

    const wrongSignature = cryptoSign(null, Buffer.from("not-the-challenge"), privateKey).toString(
      "base64url",
    );

    await expect(
      approveDeviceApprovalFlow.execute(
        { challenge: CHALLENGE, deviceId: DEVICE_ID, signature: wrongSignature },
        ctx,
      ),
    ).rejects.toMatchObject({ statusCode: 403, message: /Invalid device signature/i });

    expect(ctx.db.deviceApproval.update).not.toHaveBeenCalled();
  });

  it("throws 403 for an unknown or untrusted device", async () => {
    const ctx = createMockFlowCtx({ identityId: IDENTITY_ID });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(pendingApproval());
    ctx.db.pairedDevice.findFirst.mockResolvedValue(null);

    await expect(
      approveDeviceApprovalFlow.execute(
        { challenge: CHALLENGE, deviceId: DEVICE_ID, signature: signChallenge(CHALLENGE) },
        ctx,
      ),
    ).rejects.toMatchObject({ statusCode: 403, message: /Unknown or untrusted device/i });

    expect(ctx.db.deviceApproval.update).not.toHaveBeenCalled();
  });

  it("throws 403 when approving another identity's request", async () => {
    const ctx = createMockFlowCtx({ identityId: IDENTITY_ID });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(
      pendingApproval({ identityId: "someone-else" }),
    );

    await expect(
      approveDeviceApprovalFlow.execute(
        { challenge: CHALLENGE, deviceId: DEVICE_ID, signature: signChallenge(CHALLENGE) },
        ctx,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(ctx.db.pairedDevice.findFirst).not.toHaveBeenCalled();
  });

  it("throws 400 and expires a stale request", async () => {
    const ctx = createMockFlowCtx({ identityId: IDENTITY_ID });
    ctx.db.deviceApproval.findUnique.mockResolvedValue(
      pendingApproval({ expiresAt: new Date(Date.now() - 1000) }),
    );
    ctx.db.deviceApproval.update.mockResolvedValue({});

    await expect(
      approveDeviceApprovalFlow.execute(
        { challenge: CHALLENGE, deviceId: DEVICE_ID, signature: signChallenge(CHALLENGE) },
        ctx,
      ),
    ).rejects.toMatchObject({ statusCode: 400, message: /expired/i });

    expect(ctx.db.deviceApproval.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "expired" } }),
    );
  });

  it("throws 401 without authentication", async () => {
    const ctx = createMockFlowCtx(); // identityId undefined

    await expect(
      approveDeviceApprovalFlow.execute(
        { challenge: CHALLENGE, deviceId: DEVICE_ID, signature: signChallenge(CHALLENGE) },
        ctx,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
