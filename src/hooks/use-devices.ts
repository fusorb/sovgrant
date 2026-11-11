"use client";

import { useCallback } from "react";
import { devices } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/**
 * useDevices - known devices tied to the signed-in identity.
 *
 * Uses the local adapter rather than IdentitySdk: the SDK's `Device` type
 * ({ name, lastUsedAt }) does not describe what GET /identity/devices returns
 * ({ platform, browser, lastSeenAt }) - see P1-4.
 */
export function useDevices() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => devices.list()), [guard]);

  const remove = useCallback(
    (id: string) => guard(() => devices.revoke(id)),
    [guard],
  );

  return { list, remove };
}
