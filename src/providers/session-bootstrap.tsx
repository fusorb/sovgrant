"use client";

import { useEffect, useRef } from "react";
import { useAuthStore, useTenantStore } from "@fusorb/facet-store";
import { useAuth } from "@fusorb/facet-auth";
import { tenants } from "@/sdk";

const ACTIVE_TENANT_KEY = "sg-active-tenant";

/**
 * SessionBootstrap - reconciles facet-auth's session into the Zustand store the
 * SDK and hooks read, then hydrates the tenant store.
 *
 * Runs INSIDE SgProvider, after AuthBootstrap has already exchanged the refresh
 * cookie, so when facet reports its session resolved we either hold a real
 * access token or have a confirmed judgement that there is none. facet-auth is
 * the source of truth for the session; this only mirrors the outcome into the
 * store and releases anything waiting on `isLoading` (the root redirect, route
 * guards).
 */
export function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const { user, accessToken, isLoading } = useAuth();
  const hydrated = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    const store = useAuthStore.getState();
    if (user) store.setUser(user);
    // Nothing should stay blocked waiting on a session that has now resolved.
    store.setLoading(false);
  }, [user, isLoading]);

  // Hydrate tenants only once a token actually exists. The SDK only retries a
  // 401 with onTokenRefresh when it already holds one, so attempting this
  // before a token is available would just 401 and be lost. `hydrated` is set
  // only after a successful list, and a changed accessToken re-runs this, so a
  // transient failure does not disable tenant hydration for the session.
  useEffect(() => {
    if (isLoading || !accessToken || hydrated.current || inFlight.current) {
      return;
    }
    inFlight.current = true;
    let cancelled = false;

    void (async () => {
      const result = await tenants.list();
      inFlight.current = false;
      if (cancelled || !result.data?.length) return;

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

      hydrated.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, accessToken]);

  return <>{children}</>;
}
