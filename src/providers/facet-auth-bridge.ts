"use client";

import type { TokenStorage } from "@fusorb/facet-auth";
import { useAuthStore } from "@fusorb/facet-store";
import { sgClient } from "@/sdk";

/**
 * Bridges @fusorb/facet-auth's SgProvider to our Zustand auth store.
 *
 * facet-auth wants a TokenStorage for persistence; ours routes through
 * useAuthStore so the Zustand store stays the single source of truth
 * (auth store -> SDK client -> API convention is preserved).
 */
export const zustandTokenStorage: TokenStorage = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (accessToken, refreshToken) => {
    useAuthStore.getState().setTokens(accessToken, refreshToken);
    sgClient.setAccessToken(accessToken);
  },
  clearTokens: () => {
    // SgProvider calls this during its init session-check when me() fails
    // (e.g. expired token). We must NOT wipe the Zustand store here - that
    // would erase the auth state SessionBootstrap just restored. The SDK's
    // onAuthCleared (triggered after a failed token refresh) is the correct
    // place for full cleanup.
    sgClient.setAccessToken(null);
  },
};
