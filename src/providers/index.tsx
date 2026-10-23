"use client";

import { ArcProvider as SgProvider } from "@fusorb/facet-auth";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { zustandTokenStorage } from "@/providers/facet-auth-bridge";
import { sgClient, persistSession, clearPersistedSession } from "@/sdk";
import { useAuthStore } from "@fusorb/facet-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SgProvider
        client={sgClient}
        storage={zustandTokenStorage}
        onSessionRestore={(user) => {
          // Keep the Zustand store's user in sync when SgProvider restores
          // or resolves a session (login, magic link, social, refresh).
          const state = useAuthStore.getState();
          if (!state.user) state.setUser(user);
        }}
        onAuthChange={({ user, isAuthenticated }) => {
          if (isAuthenticated && user) {
            useAuthStore.getState().setUser(user);
            // Only the user is persisted — tokens live in the httpOnly cookie.
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
        <AuthProvider>{children}</AuthProvider>
      </SgProvider>
    </ThemeProvider>
  );
}
