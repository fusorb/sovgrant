"use client";

import { useCallback } from "react";
import { useAuthStore, useTenantStore } from "@fusorb/facet-store";
import { tenants as tenantsSdk, sgClient, persistSession } from "@/sdk";

const ACTIVE_TENANT_KEY = "sg-active-tenant";

/**
 * useTenant - tenant list, active tenant, and switching.
 *
 * Switching calls POST /auth/switch-context and pushes the returned
 * tenant-scoped token bundle into the auth store + SDK client, so every
 * subsequent request carries the new tenant's `tid` claim.
 */
export function useTenant() {
  const {
    activeTenant,
    tenants,
    isLoading,
    setActiveTenant,
    setTenants,
    setLoading,
  } = useTenantStore();

  const hydrateTenants = useCallback(async () => {
    setLoading(true);
    const result = await tenantsSdk.list();

    if (result.data && result.data.length > 0) {
      setTenants(result.data);

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
      if (target) setActiveTenant(target);
    } else {
      setTenants([]);
      setActiveTenant(null);
    }

    setLoading(false);
  }, [setActiveTenant, setTenants, setLoading]);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      const result = await tenantsSdk.switchTenant(tenantId);

      if (result.data) {
        const target = tenants.find((t) => t.id === tenantId) ?? null;
        setActiveTenant(target);
        if (target) {
          localStorage.setItem(ACTIVE_TENANT_KEY, JSON.stringify(target));
        }

        const { accessToken, refreshToken } = result.data;
        const { user } = useAuthStore.getState();
        if (user) {
          useAuthStore.getState().setAuth(user, accessToken, refreshToken ?? "");
          persistSession(user);
        } else {
          useAuthStore.getState().setTokens(accessToken, refreshToken ?? "");
        }
        sgClient.setAccessToken(accessToken);
      }

      return result;
    },
    [tenants, setActiveTenant],
  );

  const createTenant = useCallback(
    async (name: string, slug: string) => {
      const result = await tenantsSdk.create({ name, slug });
      if (result.data) {
        setTenants([result.data, ...tenants]);
        setActiveTenant(result.data);
        localStorage.setItem(ACTIVE_TENANT_KEY, JSON.stringify(result.data));
      }
      return result;
    },
    [tenants, setActiveTenant, setTenants],
  );

  const listMembers = useCallback(
    (tenantId: string) => tenantsSdk.listMembers(tenantId),
    [],
  );

  const acceptInvite = useCallback(
    (token: string) => tenantsSdk.acceptInvite({ token }),
    [],
  );

  return {
    activeTenant,
    tenants,
    isLoading,
    setActiveTenant,
    setTenants,
    hydrateTenants,
    listMembers,
    switchTenant,
    createTenant,
    acceptInvite,
  };
}
