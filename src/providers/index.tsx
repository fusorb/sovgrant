"use client";

import { SgProvider } from "@fusorb/facet-auth";
import { ThemeProvider, Toaster } from "@fusorb/facet-components";
import { useAuthStore } from "@fusorb/facet-store";
import { sgClient, persistSession, clearPersistedSession } from "@/sdk";
import { zustandTokenStorage } from "./facet-auth-bridge";
import { SessionBootstrap } from "./session-bootstrap";

/**
 * Root provider stack:
 *   ThemeProvider (facet-components) -> SgProvider (facet-auth) ->
 *   SessionBootstrap -> children + Toaster.
 *
 * Auth state lives in the Zustand store (@fusorb/facet-store); SgProvider is
 * bridged to it via zustandTokenStorage so the store stays the single source
 * of truth and the SDK client owns the bearer token.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" attribute="data-theme">
      <SgProvider
        client={sgClient}
        storage={zustandTokenStorage}
        onSessionRestore={(user) => {
          // Keep the Zustand store's user in sync when SgProvider restores or
          // resolves a session (login, magic link, social, refresh).
          const state = useAuthStore.getState();
          if (!state.user) state.setUser(user);
        }}
        onAuthChange={({ user, isAuthenticated }) => {
          if (isAuthenticated && user) {
            useAuthStore.getState().setUser(user);
            // Only the user is persisted - tokens live in the httpOnly cookie.
            persistSession(user);
          } else {
            // Only clear auth state if the user was previously authenticated in
            // our store. This prevents SgProvider's initial session-check from
            // firing a false "logged out" event and wiping a restored session.
            const state = useAuthStore.getState();
            if (state.isAuthenticated) {
              state.clearAuth();
              clearPersistedSession();
            }
          }
        }}
      >
        <SessionBootstrap>{children}</SessionBootstrap>
        <Toaster />
      </SgProvider>
    </ThemeProvider>
  );
}
