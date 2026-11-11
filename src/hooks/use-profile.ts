"use client";

import { useCallback } from "react";
import { identity } from "@/sdk";
import type { JsonObject } from "@fusorb/facet-sdk";
import { useApiGuard } from "./use-api-guard";

export function useProfile() {
  const guard = useApiGuard();

  const updateProfile = useCallback(
    (data: { name?: string; picture?: string; metadata?: JsonObject }) =>
      guard(() => identity.updateProfile(data)),
    [guard],
  );

  const deleteAccount = useCallback(
    () => guard(() => identity.deleteAccount()),
    [guard],
  );

  return { updateProfile, deleteAccount };
}
