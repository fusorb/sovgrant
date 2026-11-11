-- Repair: make the migration chain reproduce schema.prisma (zero drift).
--
-- Generated with:
--   prisma migrate diff --from-migrations prisma/migrations \
--     --to-schema prisma/schema.prisma --script
--
-- WHY THIS EXISTS
-- The committed chain had drifted from prisma/schema.prisma, and the drift was
-- invisible to `pnpm test` because the suite mocks the database. Consequences
-- against a real Postgres - all of them runtime failures, not test failures:
--
--   1. PairedDevice and DeviceApproval were declared in the schema but no
--      migration ever created them. Seven flows read them
--      (register/list/revoke-paired-device, create/poll/approve/reject-device-
--      approval), so device pairing and device approvals were broken.
--   2. PASSKEY_USED, CREDENTIAL_ISSUED and CREDENTIAL_REVOKED were dropped
--      from the AuditLogAction enum by 20260822000000_remove_dead_audit_enum_
--      values. That migration rebuilt the enum from a hand-copied list and
--      omitted three values that were still live, while the schema kept
--      declaring them. Credential issuance (issue-credential.flow.ts), credential
--      revocation (revoke-credential.flow.ts) and passkey login
--      (passkey-authenticate.flow.ts) all write these actions, so each would
--      fail with "invalid input value for enum".
--   3. ApiKey and ExternalIdentifier columns did not match the schema
--      (timestamp precision, dropped defaults, missing index and foreign keys).
--
-- The migration chain is the source of truth for deployed databases, so the
-- gap is closed here rather than by relaxing the schema. Every statement is
-- additive apart from column type/default alignment on existing tables.
--
-- After this lands, the Tier-2 check in prisma/migrations/rollback.test.ts
-- (ARC_ID_ROLLBACK_TEST=1 + a reachable DATABASE_URL) should report no drift.

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditLogAction" ADD VALUE 'PASSKEY_USED';
ALTER TYPE "AuditLogAction" ADD VALUE 'CREDENTIAL_ISSUED';
ALTER TYPE "AuditLogAction" ADD VALUE 'CREDENTIAL_REVOKED';

-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "scopes" DROP DEFAULT,
ALTER COLUMN "lastUsedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ExternalIdentifier" ALTER COLUMN "verificationExpiresAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PairedDevice" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "name" TEXT,
    "platform" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trusted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PairedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceApproval" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "pairedDeviceId" TEXT,
    "challenge" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'login',
    "context" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "DeviceApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PairedDevice_deviceId_key" ON "PairedDevice"("deviceId");

-- CreateIndex
CREATE INDEX "PairedDevice_identityId_idx" ON "PairedDevice"("identityId");

-- CreateIndex
CREATE INDEX "PairedDevice_deviceId_idx" ON "PairedDevice"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceApproval_challenge_key" ON "DeviceApproval"("challenge");

-- CreateIndex
CREATE INDEX "DeviceApproval_identityId_idx" ON "DeviceApproval"("identityId");

-- CreateIndex
CREATE INDEX "DeviceApproval_challenge_idx" ON "DeviceApproval"("challenge");

-- CreateIndex
CREATE INDEX "DeviceApproval_status_idx" ON "DeviceApproval"("status");

-- CreateIndex
CREATE INDEX "DeviceApproval_expiresAt_idx" ON "DeviceApproval"("expiresAt");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairedDevice" ADD CONSTRAINT "PairedDevice_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceApproval" ADD CONSTRAINT "DeviceApproval_pairedDeviceId_fkey" FOREIGN KEY ("pairedDeviceId") REFERENCES "PairedDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceApproval" ADD CONSTRAINT "DeviceApproval_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
