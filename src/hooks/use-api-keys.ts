"use client";

import { useCallback } from "react";
import { apiKeys, type CreateApiKeyParams } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/**
 * useApiKeys - machine credentials for the API.
 *
 * Uses facet-sdk's ApiKeySdk. The plaintext key is returned only by `create` -
 * it is never retrievable again.
 */
export function useApiKeys() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => apiKeys.list()), [guard]);

  const create = useCallback(
    (data: CreateApiKeyParams) => guard(() => apiKeys.create(data)),
    [guard],
  );

  const revoke = useCallback(
    (id: string) => guard(() => apiKeys.revoke(id)),
    [guard],
  );

  return { list, create, revoke };
}
