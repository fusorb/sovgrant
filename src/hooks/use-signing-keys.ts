"use client";

import { useCallback } from "react";
import { tenants } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/** The tenant's key material for signing DIDs and Verifiable Credentials. */
export function useSigningKeys() {
  const guard = useApiGuard();

  const list = useCallback(
    (tenantId: string) => guard(() => tenants.listSigningKeys(tenantId)),
    [guard],
  );

  const create = useCallback(
    (tenantId: string, data: { displayName?: string; expiresAt?: string }) =>
      guard(() => tenants.createSigningKey(tenantId, data)),
    [guard],
  );

  const revoke = useCallback(
    (tenantId: string, kid: string) =>
      guard(() => tenants.revokeSigningKey(tenantId, kid)),
    [guard],
  );

  return { list, create, revoke };
}
