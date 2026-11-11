"use client";

import { useCallback } from "react";
import { policies } from "@/sdk";
import type { TenantPolicyUpdate } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/**
 * usePolicy - the tenant's enforcement policy.
 *
 * Uses the local adapter rather than TenantSdk: the SDK's TenantPolicy type
 * omits requireLegalConsent / sessionTtlMinutes / allowedEmailDomains /
 * maxSessionsPerUser / allowPasskeys, and zod silently strips the fields it
 * does not know, so those updates were being dropped without an error - see
 * P1-4.
 *
 * `get` resolves to null when the tenant has no policy row yet; check the
 * error arm before reading `data`.
 */
export function usePolicy() {
  const guard = useApiGuard();

  const get = useCallback(
    (tenantId: string) => guard(() => policies.get(tenantId)),
    [guard],
  );

  const update = useCallback(
    (tenantId: string, data: TenantPolicyUpdate) =>
      guard(() => policies.update(tenantId, data)),
    [guard],
  );

  return { get, update };
}
