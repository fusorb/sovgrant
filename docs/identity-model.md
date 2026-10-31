# ADR: Identity Model - SovGrant as the Canonical IdP

- **Status:** Accepted (2026-10-31)
- **Applies to:** SovGrant (the IdP) and **all relying parties** - first-party Fusorb products (Relnex, Scholium, Facet, ...) **and third-party client systems and products**
- **Related:** `docs/planning/sovgrant-v2-roadmap.md`, `AGENTS.md`, `CLAUDE.md`
- **Mirror:** the same decision is recorded in each product (see `relnex/docs/identity-model.md`)

---

## Context

Multiple Fusorb products need user accounts - and so do **third-party client systems
and products we do not own**. If each one owns credentials, sessions, and profile,
we get fragmentation: drift between services, several password surfaces, and
inconsistent session/refresh behavior. A user must be able to hold an account across
Relnex, Scholium, Facet, and external clients while their **canonical identity stays
in one place**.

## Decision

**SovGrant is the single Identity Provider (IdP).** Every consumer - first-party or
third-party - is a **relying party** that references identity by `identityId` and
never owns credentials. The integration contract is **OIDC**. SovGrant must therefore
be a *general-purpose* IdP, not an internal-only service.

### SovGrant owns (canonical)

| Area | SovGrant surface |
|---|---|
| Identity | `Identity` (id, primaryEmail, status, emailVerified, globalRole) |
| Credentials | password/`LocalAccount`, WebAuthn passkeys, TOTP MFA + recovery, magic link |
| Sessions | `Session`, access/refresh tokens, JTI blocklist, refresh rotation |
| Federation | OAuth/OIDC clients, PKCE, social login, SAML2 / OIDC IdP connections |
| Tokens | issuance + **JWKS** (relying parties verify locally) |
| Orgs / access | `Tenant`, `Membership`, RBAC (permissions + scopes), `TenantPolicy` |
| Consent | authorization consent screen + scope approval per client |
| Lifecycle | account deletion, suspension, verification, webhooks to relying parties |
| Onboarding | `OnboardingFlow` (per project) + `OnboardingProgress` (per identity), via the SDK |

### Two classes of relying party

| | **First-party** (Fusorb products) | **Third-party** (external clients) |
|---|---|---|
| Trust | trusted, first-party | untrusted by default |
| Integration | OIDC plus shared packages (`@fusorb/facet-auth`, `@fusorb/facet-sdk`) | public OIDC surface only: discovery, `authorize` + PKCE, `token`, `userinfo`, `introspect`, `revoke`, JWKS |
| Auth UI | embed shared auth UI | redirect to SovGrant's hosted login + consent |
| Token verification | **JWKS** (retire shared secret) | **JWKS only** - never a shared secret |
| Data | may keep a local projection keyed by `identityId` | same |

### Token flow

- **Ceremonies** (login, register, MFA, password reset, passkey, OAuth, refresh,
  logout) -> SovGrant.
- **Steady state** -> relying parties verify the JWT **locally via JWKS**; no
  per-request round-trip. SovGrant issues, relying parties verify.
- Shared-secret verification (`SG_JWT_SECRET`) is a **temporary, first-party-only**
  shortcut (Relnex today); the target for everyone is JWKS.
- New relying parties register as **OIDC clients** (authorization code + PKCE).

### Sync

Relying-party projections stay consistent with SovGrant **one-way via webhooks**
(identity created/suspended/deleted/updated). Relying parties must not treat a cached
email or display name as authoritative.

## The relying-party contract (what SovGrant expects)

1. Never store credentials or MFA state. Route identity operations to SovGrant.
2. Key all local data by `identityId`; never copy identity attributes as authority.
3. Verify tokens via JWKS (retire shared secrets).
4. First-party: reuse the shared auth UI (`@fusorb/facet-auth`) so login does not diverge.
5. Link to the single canonical identity-settings surface rather than re-hosting
   password/session/security settings.
6. Consume org/tenant membership, roles, and scopes from SovGrant; keep only local,
   non-identity roles.
7. Third-party clients are consent- and scope-gated and get no privileged access.

## Consequences / Open items

- SovGrant must keep JWKS, OIDC discovery + client registration, the consent screen,
  the scope registry, and webhook delivery stable - these are the load-bearing
  contract for every relying party, internal and external.
- Treat first-party products as clients of the same public OIDC contract (dogfood it),
  adding only shared UI/SDK convenience on top.
- Decide client registration model for third parties (admin-managed vs dynamic).
- Decide whether org/tenant membership is fully canonical in SovGrant or partly per-party.
- Onboarding is backend + SDK only today; decide whether to ship a shared UI from
  `@fusorb/facet-*` or let each relying party render the steps.
