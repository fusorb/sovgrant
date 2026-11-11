"use client";

import { useCallback } from "react";
import { tenants } from "@/sdk";
import type { TenantPolicy } from "@fusorb/facet-sdk";
import { useApiGuard } from "./use-api-guard";

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
