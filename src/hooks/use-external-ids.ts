"use client";

import { useCallback } from "react";
import { externalIds } from "@/sdk";
import type { ExternalIdType } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/**
 * useExternalIds - externally-verified identifiers (NIN, BVN, passports)
 * linked to the signed-in identity.
 *
 * Uses the local adapter rather than IdentitySdk: the published SDK sends
 * `{ provider, externalId }` to POST /identity/external-ids, which the route's
 * validator rejects (it expects `{ type, value, displayValue? }`) - see P1-4.
 */
export function useExternalIds() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => externalIds.list()), [guard]);

  const link = useCallback(
    (data: { type: ExternalIdType; value: string; displayValue?: string }) =>
      guard(() => externalIds.link(data)),
    [guard],
  );

  const unlink = useCallback(
    (id: string) => guard(() => externalIds.unlink(id)),
    [guard],
  );

  const requestVerification = useCallback(
    (id: string) => guard(() => externalIds.requestVerification(id)),
    [guard],
  );

  const confirmVerification = useCallback(
    (id: string, code: string) =>
      guard(() => externalIds.confirmVerification(id, code)),
    [guard],
  );

  return { list, link, unlink, requestVerification, confirmVerification };
}
