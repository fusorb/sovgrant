"use client";

import { useCallback } from "react";
import { identity } from "@/sdk";

export function usePairedDevices() {
  const list = useCallback(async () => {
    const res = await identity.listPairedDevices();
    return res;
  }, []);

  const revoke = useCallback(async (deviceId: string) => {
    const res = await identity.revokePairedDevice(deviceId);
    return res;
  }, []);

  return { list, revoke };
}
