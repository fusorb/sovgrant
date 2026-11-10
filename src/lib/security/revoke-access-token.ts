// src/lib/security/revoke-access-token.ts
//
// Single pairing point for access-token revocation: the durable `RevokedJti`
// row (authoritative - consulted by the auth guard when Redis is unavailable)
// plus the Redis fast-path (`blockJti`).
//
// Why this exists: the two tiers used to be written independently as
// fire-and-forget `void ... .catch(() => {})` calls, so a failed DB write was
// silently discarded and revocation could survive only in Redis' in-memory
// fallback (single-process, lost on restart). The DB write is now awaited and
// idempotent; Redis stays best-effort but its failures are logged, never
// swallowed.
//
// The block TTL is always derived from the token's own `expiresAt` so the
// Redis entry expires exactly when the JWT would have.

import type { DbClient } from "@/lib/db-client";
import { logger } from "@/lib/logger";
import { blockJti } from "./jti-blocklist";

function remainingTtlSeconds(expiresAt: Date): number {
  return Math.max(Math.ceil((expiresAt.getTime() - Date.now()) / 1000), 1);
}

/**
 * Redis fast-path only - use when the caller has already written the durable
 * `RevokedJti` row inside its own transaction. Fire-and-forget by design:
 * `blockJti` falls back to an in-memory store internally, but an unexpected
 * rejection is logged rather than silently discarded.
 */
export function blockJtiBestEffort(jti: string, expiresAt: Date): void {
  void blockJti(jti, remainingTtlSeconds(expiresAt)).catch((err) => {
    logger.warn({ err, jti }, "[REVOKE] Redis blockJti failed");
  });
}

/**
 * Revoke a single access token's JTI on both tiers.
 *
 * The `RevokedJti` write is awaited (never fire-and-forget) and done via
 * `upsert` so re-revoking the same JTI cannot abort the enclosing transaction
 * with a uniqueness error.
 */
export async function blocklistAccessToken(
  db: DbClient,
  jti: string,
  expiresAt: Date,
): Promise<void> {
  await db.revokedJti.upsert({
    where: { jti },
    create: { jti, expiresAt },
    update: {},
  });

  blockJtiBestEffort(jti, expiresAt);
}
