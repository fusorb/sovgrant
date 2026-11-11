"use client";

import { useCallback } from "react";
import { identity } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/** Known devices (browser/client fingerprints) tied to the signed-in user. */
export function useDevices() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => identity.listDevices()), [guard]);

  const remove = useCallback(
    (id: string) => guard(() => identity.deleteDevice(id)),
    [guard],
  );

  return { list, remove };
}
