"use client";

import { useCallback } from "react";
import { identity } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/**
 * useDevices - known devices tied to the signed-in identity.
 */
export function useDevices() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => identity.listDevices()), [guard]);

  const remove = useCallback(
    (id: string) => guard(() => identity.deleteDevice(id)),
    [guard],
  );

  return { list, remove };
}
