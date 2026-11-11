"use client";

import { useCallback } from "react";
import { identity } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

export function useIdentities() {
  const guard = useApiGuard();

  const list = useCallback(
    (params?: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    }) => guard(() => identity.list(params)),
    [guard],
  );

  const suspend = useCallback(
    (id: string, reason?: string) => guard(() => identity.suspend(id, reason)),
    [guard],
  );

  const reinstate = useCallback(
    (id: string, reason?: string) => guard(() => identity.reinstate(id, reason)),
    [guard],
  );

  return { list, suspend, reinstate };
}
