"use client";

import { useCallback } from "react";
import { tenants } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/** Tenant DID (did:web) provisioning and lookup. */
export function useTenantDid() {
  const guard = useApiGuard();

  const get = useCallback(
    (tenantId: string) => guard(() => tenants.getDid(tenantId)),
    [guard],
  );

  const provision = useCallback(
    (tenantId: string, domain: string) =>
      guard(() => tenants.provisionDid(tenantId, { domain })),
    [guard],
  );

  return { get, provision };
}
