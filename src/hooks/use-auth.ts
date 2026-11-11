"use client";

import { useCallback } from "react";
import { useAuth as useFacetAuth } from "@fusorb/facet-auth";
import { useAuthStore } from "@fusorb/facet-store";
import { auth, sgClient, persistSession } from "@/sdk";

/**
 * useAuth - the repo's single auth entry point.
 *
 * Login, register, logout, MFA verification, password reset and step-up all
 * live in @fusorb/facet-auth's context hook, which is already wired to the
 * Zustand store through the storage bridge in providers/. This hook composes
 * that context and adds only the endpoints facet-auth does not expose -
 * email verification and the magic-link exchange - so the token/store wiring
 * is never duplicated.
 */
export function useAuth() {
  const core = useFacetAuth();

  const verifyEmail = useCallback(
    (token: string) => auth.verifyEmail(token),
    [],
  );

  const requestMagicLink = useCallback(
    (email: string) => auth.requestMagicLink(email),
    [],
  );

  const authenticateMagicLink = useCallback(async (token: string) => {
    const result = await auth.authenticateMagicLink(token);

    // The magic-link exchange bypasses facet-auth's provider, so wire the
    // returned tokens into the store + client ourselves.
    if (result.data?.accessToken) {
      const { identity, accessToken, refreshToken } = result.data;
      useAuthStore.getState().setAuth(identity, accessToken, refreshToken ?? "");
      sgClient.setAccessToken(accessToken);
      persistSession(identity);
    }

    return result;
  }, []);

  return {
    ...core,
    verifyEmail,
    requestMagicLink,
    authenticateMagicLink,
  };
}

/** OAuth social login URL against the SovGrant API. */
export function socialAuthUrl(provider: "google" | "github") {
  const base =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  return `${base}/auth/${provider}`;
}
