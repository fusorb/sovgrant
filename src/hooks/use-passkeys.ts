"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { passkeys } from "@/sdk";

export function usePasskeys() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const list = useCallback(async () => {
    if (!accessToken) return { data: null, error: { statusCode: 401, error: "Unauthorized", message: "No access token" } as const };
    return passkeys.list();
  }, [accessToken]);

  const registrationOptions = useCallback(async (name: string) => {
    if (!accessToken) return { data: null, error: { statusCode: 401, error: "Unauthorized", message: "No access token" } as const };
    return passkeys.registrationOptions({ name });
  }, [accessToken]);

  const register = useCallback(async (data: Record<string, unknown>) => {
    if (!accessToken) return { data: null, error: { statusCode: 401, error: "Unauthorized", message: "No access token" } as const };
    return passkeys.register(data);
  }, [accessToken]);

  const authenticationOptions = useCallback(async (sessionId?: string) => {
    return passkeys.authenticationOptions(sessionId);
  }, []);

  const authenticate = useCallback(async (data: Record<string, unknown>) => {
    return passkeys.authenticate(data);
  }, []);

  const deregister = useCallback(async (passkeyId: string) => {
    if (!accessToken) return { data: null, error: { statusCode: 401, error: "Unauthorized", message: "No access token" } as const };
    return passkeys.deregister(passkeyId);
  }, [accessToken]);

  return { list, registrationOptions, register, authenticationOptions, authenticate, deregister };
}
