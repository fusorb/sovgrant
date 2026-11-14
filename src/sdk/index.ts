/**
 * SovGrant SDK - singleton wiring for @fusorb/facet-sdk.
 *
 * The domain SDKs are class-based (`new AuthSdk(client)`) and live in the
 * published @fusorb/facet-sdk package. This module owns the single SgClient
 * instance - wired to the Zustand auth store for 401 auto-refresh and
 * auth-cleared handling - and re-exports the domain SDKs as singletons so
 * consumers keep a stable `import { auth, tenants, ... } from "@/sdk"` API.
 *
 * Chain: page -> component -> hook -> store -> SDK -> API.
 */

import {
  SgClient,
  AuthSdk,
  BillingSdk,
  AuditSdk,
  TenantSdk,
  VcSdk,
  IdentitySdk,
  OAuthSdk,
  WebhooksSdk,
  PasskeySdk,
  IdpSdk,
  ApiKeySdk,
  type ApiError,
  type ApiKey,
  type ApiResponse,
  type AuditListParams,
  type CreateApiKeyParams,
  type CreatedApiKey,
  type TenantPolicy,
  type User,
} from "@fusorb/facet-sdk";
import { useAuthStore, useTenantStore } from "@fusorb/facet-store";
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
} from "@/lib/refresh-cookies";

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const AUTH_STORAGE_KEY = "sg-session";

// ── Session persistence (user only - tokens live in httpOnly cookies) ───────

/** Persist the current user so SessionBootstrap can restore identity on load. */
export function persistSession(user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user }));
}

/** Remove the persisted session (logout, refresh failure, auth cleared). */
export function clearPersistedSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/** Read the persisted user (identity only - never tokens). */
export function readPersistedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { user?: User }).user ?? null;
  } catch {
    return null;
  }
}

// ── Client singleton ────────────────────────────────────────────────────────

function onAuthCleared() {
  useAuthStore.getState().clearAuth();
  useTenantStore.getState().reset();
  clearPersistedSession();
}

// Re-entrancy guard: the client's request() retries with a fresh token after
// onTokenRefresh resolves, but the refresh call itself goes through the same
// client. If POST /oauth/token ever 401s, request() would call onTokenRefresh
// again - recursing forever. The flag short-circuits the second entry so the
// original failure path (onAuthCleared) runs instead.
let refreshInFlight = false;

// Holds the AuthSdk so onTokenRefresh can reach it. The client must be built
// before the SDK instances exist, so a holder object avoids a forward-declared
// binding (which `prefer-const` would flag).
const sdkRef: { auth?: AuthSdk } = {};

const client = new SgClient({
  baseUrl: BASE_URL,
  // The refresh token is an httpOnly cookie. `fetch` defaults to
  // credentials: "same-origin", and this app calls the API on a different
  // origin (:3000 -> :4000), so without this the browser neither stores the
  // cookie set at login nor sends it on refresh - the entire cookie-based
  // refresh path is inert. The backend already sends
  // Access-Control-Allow-Credentials (build-server.ts registers cors with
  // credentials: true against ALLOWED_ORIGINS). Safe same-origin too.
  // Tracked as P0-7 in .agent/output.txt.
  fetchInit: { credentials: "include" },
  onTokenRefresh: async (): Promise<string | null> => {
    if (refreshInFlight) return null;

    const authSdk = sdkRef.auth;
    if (!authSdk) return null;

    refreshInFlight = true;
    try {
      // The refresh token lives in an httpOnly cookie (set by the backend).
      // Pass an empty string - /oauth/token reads from the cookie when the
      // body value is empty.
      const { data, error } = await authSdk.refresh("");
      if (error || !data?.accessToken) {
        onAuthCleared();
        return null;
      }

      useAuthStore
        .getState()
        .setTokens(data.accessToken, data.refreshToken ?? "");
      return data.accessToken;
    } finally {
      refreshInFlight = false;
    }
  },
  onAuthCleared,
});

// ── Domain SDKs (facet-sdk classes) ─────────────────────────────────────────

const authSdk = new AuthSdk(client);
sdkRef.auth = authSdk;

export const auth = authSdk;
export const tenants = new TenantSdk(client);
export const billing = new BillingSdk(client);
export const credentials = new VcSdk(client);
export const audit = new AuditSdk(client);
export const identity = new IdentitySdk(client);
export const oauth = new OAuthSdk(client);
export const webhooks = new WebhooksSdk(client);
export const passkeys = new PasskeySdk(client);
export const idp = new IdpSdk(client);
export const apiKeys = new ApiKeySdk(client);

// ── Route contract types ────────────────────────────────────────────────────
// facet-sdk types `linkExternalId`'s `type` as a plain string, while
// POST /identity/external-ids accepts exactly these six values (the route's
// EXTERNAL_ID_TYPES enum). Keeping the union here means a wrong identifier type
// fails at compile time instead of as a 400 at runtime.

export type ExternalIdType =
  | "email"
  | "phone"
  | "nin"
  | "bvn"
  | "passport"
  | "driver_license";

// ── Re-exports ──────────────────────────────────────────────────────────────

export const sgClient = client;

export { REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS };
export type {
  ApiError,
  ApiKey,
  ApiResponse,
  AuditListParams,
  CreateApiKeyParams,
  CreatedApiKey,
  TenantPolicy,
  User,
};
