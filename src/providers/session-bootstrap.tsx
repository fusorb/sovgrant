"use client";

import { useEffect, useRef } from "react";
import { useAuthStore, useTenantStore } from "@fusorb/facet-store";
import { tenants, readPersistedUser } from "@/sdk";

const ACTIVE_TENANT_KEY = "sg-active-tenant";

/**
 * SessionBootstrap - restores the persisted user identity and hydrates the
 * tenant store on first mount.
 *
 * Tokens are NOT persisted to localStorage - the refresh token lives in an
 * httpOnly cookie. We restore the user with empty tokens and let the SDK's
 * onTokenRefresh obtain a fresh access token on the first 401.
 */
export function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const persisted = readPersistedUser();
      if (persisted) {
        useAuthStore.getState().setAuth(persisted, "", "");
      }
      useAuthStore.getState().setLoading(false);

      // Hydrate the tenant store with the user's organisations. `hydrated` is
      // only set after a successful list - a transient network failure must
      // not permanently disable tenant hydration for the whole session.
      if (
        cancelled ||
        !useAuthStore.getState().isAuthenticated ||
        hydrated.current
      ) {
        return;
      }

      const result = await tenants.list();
      if (cancelled) return;

      if (result.data && result.data.length > 0) {
        useTenantStore.getState().setTenants(result.data);

        let saved: { id?: string } | null = null;
        try {
          const raw = localStorage.getItem(ACTIVE_TENANT_KEY);
          saved = raw ? (JSON.parse(raw) as { id?: string }) : null;
        } catch {
          saved = null;
        }

        const target = saved
          ? result.data.find((t) => t.id === saved?.id)
          : result.data[0];
        if (target) useTenantStore.getState().setActiveTenant(target);
      }

      hydrated.current = true;
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
