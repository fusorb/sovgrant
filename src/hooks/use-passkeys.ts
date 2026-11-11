"use client";

import { useCallback } from "react";
import { passkeys } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

export function usePasskeys() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => passkeys.list()), [guard]);

  // registration/authenticationOptions and authenticate run before a session
  // exists (sign-in), so they are deliberately unguarded.
  const registrationOptions = useCallback(
    () => passkeys.registrationOptions(),
    [],
  );

  const register = useCallback(
    (data: { response: unknown; challengeId: string }) =>
      guard(() => passkeys.register(data)),
    [guard],
  );

  const authenticationOptions = useCallback(
    (identityId?: string) => passkeys.authenticationOptions(identityId),
    [],
  );

  const authenticate = useCallback(
    (data: { response: unknown; challengeId: string }) =>
      passkeys.authenticate(data),
    [],
  );

  const deregister = useCallback(
    (passkeyId: string) => guard(() => passkeys.deregister(passkeyId)),
    [guard],
  );

  return {
    list,
    registrationOptions,
    register,
    authenticationOptions,
    authenticate,
    deregister,
  };
}
