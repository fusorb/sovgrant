"use client";

import { useCallback } from "react";
import { identity } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/** Companion devices paired for approval flows (login / step-up signing). */
export function usePairedDevices() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => identity.listPairedDevices()), [
    guard,
  ]);

  const revoke = useCallback(
    (deviceId: string) => guard(() => identity.revokePairedDevice(deviceId)),
    [guard],
  );

  return { list, revoke };
}
