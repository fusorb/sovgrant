"use client";

import { useCallback } from "react";
import { identity } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/** Externally-verified identifiers (NIN, BVN, passports) linked to an identity. */
export function useExternalIds() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => identity.listExternalIds()), [
    guard,
  ]);

  const link = useCallback(
    (data: { provider: string; externalId: string }) =>
      guard(() => identity.linkExternalId(data)),
    [guard],
  );

  const unlink = useCallback(
    (id: string) => guard(() => identity.unlinkExternalId(id)),
    [guard],
  );

  return { list, link, unlink };
}
