"use client";

import { useCallback } from "react";
import { identity } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/** Scoped authority granted from one identity to another (agent, service). */
export function useDelegations() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => identity.listDelegations()), [
    guard,
  ]);

  const create = useCallback(
    (data: { subjectId: string; scope: string; expiresAt?: string }) =>
      guard(() => identity.createDelegation(data)),
    [guard],
  );

  const revoke = useCallback(
    (id: string) => guard(() => identity.revokeDelegation(id)),
    [guard],
  );

  return { list, create, revoke };
}
