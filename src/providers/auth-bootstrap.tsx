"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@fusorb/facet-store";
import { auth, clearPersistedSession, readPersistedUser } from "@/sdk";

/**
 * AuthBootstrap - exchanges the httpOnly refresh cookie for an access token
 * BEFORE facet-auth's SgProvider mounts.
 *
 * Why this cannot live inside the provider tree. Two published behaviours
 * compound, and neither can be worked around from within:
 *   1. SgProvider's mount effect reads its storage first and, when there is no
 *      access token, settles on "signed out" and returns - it only attempts the
 *      refresh-cookie exchange when a token is ALREADY present.
 *   2. SgClient only calls onTokenRefresh after a 401 when it ALREADY holds a
 *      token.
 * We deliberately persist no tokens (the refresh token is an httpOnly cookie;
 * localStorage holds the user only), so after a reload neither would ever fire.
 * The console shell rendered and every request 401'd for the rest of the
 * session.
 *
 * Resolving the cookie first means SgProvider comes up holding a real token and
 * takes its normal restore path. Tokens still never touch localStorage: the
 * access token lives in memory, the refresh token stays in the cookie.
 *
 * This stays correct even if facet-auth later learns to refresh on its own:
 * SgProvider only refreshes when storage is empty, so it would simply find the
 * token we already seeded and call `me()` instead.
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveSession() {
      // Nothing on record -> anonymous. There is no cookie worth exchanging,
      // and clearAuth() also releases anything waiting on isLoading.
      if (!readPersistedUser()) {
        useAuthStore.getState().clearAuth();
        if (!cancelled) setReady(true);
        return;
      }

      // Empty body value: /oauth/token falls back to the sg_refresh_token
      // cookie (tokens.route.ts resolves `body.refresh_token || req.cookies`).
      const result = await auth.refresh("");
      if (cancelled) return;

      const token = result.data?.accessToken ?? null;
      const status = result.error?.statusCode;

      if (token) {
        // setTokens marks the store authenticated; the facet-auth storage
        // bridge hands the token to SgClient.
        useAuthStore.getState().setTokens(token, result.data?.refreshToken ?? "");
      } else if (status === 401 || status === 403) {
        // The cookie is gone or expired - the persisted copy is stale.
        clearPersistedSession();
        useAuthStore.getState().clearAuth();
      }
      // Any other failure (e.g. a network blip, statusCode 0) leaves the
      // persisted session alone and simply yields no token, so SgProvider
      // resolves to signed-out without discarding the user's marker.

      setReady(true);
    }

    void resolveSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hold the tree until the exchange settles so SgProvider never observes a
  // half-resolved storage state. Costs one blank frame.
  if (!ready) return null;
  return <>{children}</>;
}
