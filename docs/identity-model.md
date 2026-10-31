# ADR: Identity Model - SovGrant as the Canonical IdP

- **Status:** Accepted (2026-10-31)
- **Applies to:** SovGrant (the IdP) and all Fusorb relying parties (Relnex, Scholium, Facet, ...)
- **Related:** `docs/planning/sovgrant-v2-roadmap.md`, `AGENTS.md`, `CLAUDE.md`
- **Mirror:** the same decision is recorded in each product (see `relnex/docs/identity-model.md`)

---

## Context

Multiple Fusorb products need user accounts. If each product owns credentials,
sessions, and profile, we get fragmentation: drift between services, several
password surfaces, inconsistent session/refresh behavior. A user must be able to
hold an account across Relnex, Scholium, Facet, etc. while their **canonical
identity stays in one place**.

## Decision

**SovGrant is the single Identity Provider (IdP).** Every product is a **relying
party** that references identity by `identityId` and never owns credentials. The
integration contract is **OIDC**.

### SovGrant owns (canonical)

| Area | SovGrant surface |
|---|---|
| Identity | `Identity` (id, primaryEmail, status, emailVerified, globalRole) |
| Credentials | password/`LocalAccount`, WebAuthn passkeys, TOTP MFA + recovery, magic link |
| Sessions | `Session`, access/refresh tokens, JTI blocklist, refresh rotation |
| Federation | OAuth/OIDC clients, PKCE, social login, SAML2 / OIDC IdP connections |
| Tokens | issuance + **JWKS** (products verify locally) |
| Orgs / access | `Tenant`, `Membership`, RBAC (permissions), `TenantPolicy` |
| Lifecycle | account deletion, suspension, verification, webhooks to products |
| Onboarding | `OnboardingFlow` (per project) + `OnboardingProgress` (per identity), exposed via the SDK |

### Products own (relying parties)

- A local account/profile row anchored by `identityId` (a projection, not a copy
  of identity attributes).
- Product-specific profile, preferences, onboarding state, and non-identity roles.
- Their own session surface (Relnex keeps a BFF httpOnly-cookie session).

### Token flow

- **Ceremonies** (login, register, MFA, password reset, passkey, OAuth, refresh,
  logout) -> SovGrant.
- **Steady state** -> products verify the JWT **locally via JWKS**; no per-request
  round-trip. SovGrant issues, products verify.
- Shared-secret verification (`SG_JWT_SECRET`) is a **temporary** shortcut retained
  only by Relnex; the target for all products is JWKS.
- New products register as **OIDC clients** (authorization code + PKCE).

### Sync

Product projections stay consistent with SovGrant **one-way via webhooks** (identity
created/suspended/deleted/updated). Products must not treat a cached email or
display name as authoritative.

## The relying-party contract (what SovGrant expects of products)

1. Never store credentials or MFA state. Route identity operations to SovGrant.
2. Key all local data by `identityId`; never copy identity attributes as authority.
3. Verify tokens via JWKS (retire shared secrets).
4. Reuse the shared auth UI (`@fusorb/facet-auth`) so login does not diverge.
5. Link to the single canonical identity-settings surface rather than re-hosting
   password/session/security settings.
6. Consume org/tenant membership and roles from SovGrant; keep only product-local,
   non-identity roles locally.

## Consequences / Open items

- SovGrant must keep JWKS, OIDC client registration, and webhook delivery stable -
  these are the load-bearing contract for every product.
- Confirm whether org/tenant membership is fully canonical in SovGrant or partly
  per-product, and document the boundary.
- Onboarding is currently backend + SDK only; if products need a shared UI, decide
  whether to ship one from `@fusorb/facet-*` or let each product render steps.
