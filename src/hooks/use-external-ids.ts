"use client";

import { useCallback } from "react";
import { identity } from "@/sdk";
import type { ExternalIdType } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/**
 * useExternalIds - externally-verified identifiers (NIN, BVN, passports)
 * linked to the signed-in identity.
 *
 * Verification is a user-driven code exchange: `requestVerification` sends a
 * 6-digit code to the identifier, `confirmVerification` submits what the user
 * received. Only email and phone can be verified today - NIN, BVN, passport and
 * driver's licence link but cannot be verified until a provider is integrated.
 */
export function useExternalIds() {
  const guard = useApiGuard();

  const list = useCallback(
    () => guard(() => identity.listExternalIds()),
    [guard],
  );

  const link = useCallback(
    (data: { type: ExternalIdType; value: string; displayValue?: string }) =>
      guard(() => identity.linkExternalId(data)),
    [guard],
  );

  const unlink = useCallback(
    (id: string) => guard(() => identity.unlinkExternalId(id)),
    [guard],
  );

  const requestVerification = useCallback(
    (id: string) => guard(() => identity.verifyExternalId(id)),
    [guard],
  );

  const confirmVerification = useCallback(
    (id: string, code: string) =>
      guard(() => identity.confirmExternalId(id, { code })),
    [guard],
  );

  return { list, link, unlink, requestVerification, confirmVerification };
}
