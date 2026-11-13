"use client";

import { useCallback } from "react";
import { tenants } from "@/sdk";
import type { TenantPolicy } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/**
 * usePolicy - the tenant's enforcement policy.
 *
 * `get` resolves to null when the tenant has no policy row yet; check the
 * error arm before reading `data`.
 */
export function usePolicy() {
  const guard = useApiGuard();

  const get = useCallback(
    (tenantId: string) => guard(() => tenants.getPolicy(tenantId)),
    [guard],
  );

  const update = useCallback(
    (tenantId: string, data: TenantPolicy) =>
      guard(() => tenants.updatePolicy(tenantId, data)),
    [guard],
  );

  return { get, update };
}
