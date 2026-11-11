"use client";

import { useCallback } from "react";
import { apiKeys } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/**
 * useApiKeys - machine credentials for the API.
 *
 * facet-sdk ships no ApiKeySdk, so @/sdk exposes a thin `apiKeys` adapter over
 * the generic SgClient (tracked as P1-2 in .agent/output.txt). The plaintext
 * key is returned only by `create` - it is never retrievable again.
 */
export function useApiKeys() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => apiKeys.list()), [guard]);

  const create = useCallback(
    (data: { name: string; scopes?: string[] }) =>
      guard(() => apiKeys.create(data)),
    [guard],
  );

  const revoke = useCallback(
    (id: string) => guard(() => apiKeys.revoke(id)),
    [guard],
  );

  return { list, create, revoke };
}
