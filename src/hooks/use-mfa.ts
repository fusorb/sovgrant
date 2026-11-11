"use client";

import { useCallback } from "react";
import { auth } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

/**
 * useMfa - TOTP enrollment management for the signed-in user.
 *
 * Login-time verification (verify/recovery) belongs to @fusorb/facet-auth's
 * useAuth - this hook only owns the authenticated management calls.
 */
export function useMfa() {
  const guard = useApiGuard();

  const setup = useCallback(() => guard(() => auth.setupMfa()), [guard]);

  const confirm = useCallback(
    (code: string) => guard(() => auth.confirmMfa(code)),
    [guard],
  );

  const disable = useCallback(() => guard(() => auth.disableMfa()), [guard]);

  return { setup, confirm, disable };
}
