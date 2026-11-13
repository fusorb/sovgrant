# SovGrant - Claude Code Handbook

> Verified against actual source on 2026-11-13. Do not trust claims from
> prior docs that aren't re-confirmed below - every status line here was
> checked against running tests or live source files, not old summaries.

---

## What SovGrant is
   
SovGrant is a sovereign, multi-tenant identity and access management backend.
Fastify + Prisma + Next.js 16 monorepo (pnpm, ESM-only).

**What it does today (0.1.0, pre-release):**
- Full OAuth 2.0 / OIDC provider - authorize, token exchange/refresh/revoke/introspect, JWKS, PKCE (mandatory by default)
- WebAuthn passkeys, TOTP MFA (setup/verify/recovery), magic-link auth, social login (Google/GitHub/Apple/Microsoft), SAML2 + OIDC federation
- SD-JWT Verifiable Credentials - issue/verify/revoke, W3C BitstringStatusList, did:web + did:key
- Presentation endpoint (challenge-response verification protocol) - jws-proof: 6 tests, verify-session: 5, verify-present: 9
- Multi-tenant: tenant CRUD + TenantPolicy (6 enforced fields) + RBAC (22 permissions, requirePermission()) + signing keys (KMS-encrypted)
- Webhook delivery engine (Postgres queue, FOR UPDATE SKIP LOCKED, retry/backoff, dead-letter)
- Rate limiting (per-route, per-IP), audit logging (53 action enum values), JTI blocklist (Redis two-tier + DB fallback)
- KMS encryption for signing keys at rest (AES-256-GCM, key rotation script, encrypt/decrypt passthrough)
- Email via Resend (13 templates, React Email components; static template gallery at :3888, auth emails delivered to recipient inbox)
- SMS via Brevo (transactional SMS for MFA codes + security alerts)

**Test suite: 74 files / 408 tests / 0 code failures** - all passing clean (`pnpm test`; the count includes the 10 `packages/cli` tests). Updated 2026-11-13.

---

## Repository layout

```
sovgrant/
├── src/
│   ├── api/           # Fastify server - plugins, routes, server entrypoints
│   │   ├── plugins/   # auth-guard, jwt, db, rate-limit, swagger, cors
│   │   ├── routes/    # well-known, health, DID document, mail-preview
│   │   └── server/    # build-server.ts, start-server.ts, start-workers.ts
│   ├── core/          # Shared: config, db, errors, flows, mail
│   ├── jobs/          # Background jobs - token-cleanup, webhook-worker
│   ├── lib/           # Utilities: jwt, crypto, kms, security, url-safety
│   │   ├── kms/       # AES-256-GCM key encryption/decryption + rotation
│   │   ├── security/  # rbac, jws-proof, jti-blocklist, password-rules, login-attempt
│   │   └── webhooks/  # webhook-dispatcher (fan-out), webhook-worker (delivery)
│   ├── modules/       # 10 domain modules
│   │   ├── auth/      # login, register, MFA, passkey, magic-link, sessions, step-up, social
│   │   ├── audit/     # audit log write + query
│   │   ├── billing/   # subscription (Paystack/Stripe webhooks)
│   │   ├── credentials/ # DID, SD-JWT VC, issue/verify/revoke/offer, presentation
│   │   ├── identity/  # profile, delete-account, admin, external-ids, wallet-did (delegation = 501 stub)
│   │   ├── idp/       # SAML2 + OIDC federation connections
│   │   ├── oauth/     # authorize, token, revoke, introspect, userinfo, clients, consent
│   │   ├── tenant/    # CRUD, policy, members, signing keys, projects, onboarding
│   │   ├── webhooks/  # endpoint config + delivery event routes
│   │   └── api-key/   # CRUD flows + routes, SHA-256 hashed bearer tokens
│   ├── app/           # Next.js App Router - (public) / (auth) / console / invites / oauth
│   ├── components/    # Only StubPage + PublicNavbar - everything else comes from facet
│   ├── hooks/         # One hook per backend domain - only feature layer importing @/sdk
│   ├── providers/     # ThemeProvider -> AuthBootstrap -> SgProvider -> SessionBootstrap -> Toaster
│   ├── sdk/           # SgClient singleton + facet domain SDKs (single SDK boundary)
│   └── test-utils/    # Vitest setup + mock DB helpers
├── prisma/
│   ├── schema.prisma  # Single source of truth - 47 models
│   ├── seed.ts        # SYSTEM tenant, admin user, 22 permissions
│   └── migrations/    # Mostly generated; hand-written SQL is used where Postgres
│                      # cannot express the change (enum recreation 20260822000000,
│                      # the drift repair 20261111000010). Always verify with
│                      # `ARC_ID_ROLLBACK_TEST=1` - see the Tier-2 guard.
├── docs/
│   ├── planning/     # Planning documents
│   │   ├── sovgrant-v2-roadmap.md       # Operative roadmap (v2)
│   │   ├── testing-guide.MD          # Manual API test matrix (65 checks)
│   │   ├── sovgrant-cli-design.md       # CLI basis (planned)
│   │   ├── client-core-architecture-analysis.md  # Canonical client-core conventions
│   │   ├── presentation-envelope-design.md       # Presentation endpoint design (built, ref)
│   │   ├── deploy-plan.md                        # VPS provisioning + launch deploy steps
│   │   ├── oauth-secrets-setup.md                # OAuth provider secret setup
│   │   └── LAUNCH-AUDIT-AND-PLAN.md              # Pre-launch P0/P1 audit + countdown
├── .github/workflows/
│   ├── ci.yml         # PR/push CI: typecheck, lint, secret+trivy scan, test, cli gates, rollback, build
│   ├── deploy-api.yml # Fastify API deploy (GHCR push → SSH Docker Compose)
│   └── deploy-web.yml # Next.js deploy (SSH git pull → pnpm build:web → PM2)
├── AGENTS.md          # Loaded every session - compressed rules
└── CLAUDE.md          # ← you are here
```

---

## Running the project

```bash
pnpm install
pnpm prisma:migrate      # first time setup
pnpm seed                # SYSTEM tenant + admin

pnpm dev:all             # Next.js + Fastify API + background workers
pnpm dev:api             # Fastify only (port 4000)
pnpm dev:web             # Next.js only (port 3000)
pnpm dev:workers         # Background workers only

pnpm typecheck
pnpm lint
pnpm format
pnpm test                # 408 tests, 74 files, all passing
pnpm test:watch
pnpm test:coverage
pnpm build:api
pnpm build:web

### Dev servers on Windows
- `pnpm dev:all` runs web (3000) + api (4000) + workers via concurrently; ensure
  ports are free. Memory: `NODE_OPTIONS='--max-old-space-size=4096'` for web.
- `pnpm build:api` (tsup) uses Unix `rm -rf dist`; on Windows cmd use Git Bash/WSL
  or add `rimraf`. Prefer `pnpm cli:build` (same caveat applies to packages/cli).
- Vitest runs fine on Windows for sovgrant (74 files / 408 tests). The facet repo's
  vitest workspace has Windows glob issues — run facet tests via WSL/Git Bash.
- CORS: `ALLOWED_ORIGINS` must include the frontend origin; sovport dev origin
  (`http://localhost:8081` for Expo) should be added when wiring the wallet.

### Docker deployment

```bash
# Build all images
docker compose build

# Start full stack (Postgres + Redis + API + workers)
docker compose up -d

# Run migrations (idempotent - runs automatically on container start)
docker compose run --rm api npx prisma migrate deploy --schema=prisma/schema.prisma

# Seed SYSTEM tenant + admin
docker compose run --rm api pnpm seed

# Tail logs
docker compose logs -f api

# Stop everything
docker compose down

# Full teardown (wipes volumes)
docker compose down -v
```
```

---

## Architecture rules - read before writing any code

### 1. Flows are the unit of business logic

Every multi-step operation lives in a `Flow` abstraction (`src/core/flows/flow.ts`):

```ts
interface Flow<I, O> {
  name: string;
  inputSchema: ZodSchema<I>;
  outputSchema?: ZodSchema<O>;
  execute(input: I, ctx: FlowContext): Promise<O>;
}
```

Flows execute via `FlowExecutor`, which wraps in a Prisma transaction and injects `db`, `identityId`, `tenantId`, `ip`, `requestId`.

### 2. Error handling

```ts
throw ApiError.notFound("Session not found");
throw ApiError.forbidden("Permission required: credential:issue");
throw ApiError.invalidGrant("Refresh token already used");
```

### 3. Database access

- Inside flows: `ctx.db` (transaction-scoped)
- Inside routes: `fastify.db`
- Never `import prisma` inside a flow
- Always use `select` projections - never fetch full rows for two fields

### 4. Auth guard patterns

```ts
preHandler: fastify.auth.requireUser;           // any authenticated user
preHandler: fastify.auth.requireAal2;           // MFA/passkey authenticated
preHandler: fastify.auth.requireElevated;       // recent step-up
preHandler: requirePermission("client:create"); // RBAC from src/lib/security/rbac.ts
```

Route-level patterns: `config: { rateLimit: { max: 10, timeWindow: "1 minute" } }`

### 5. Module structure

Every `src/modules/<n>/` owns: `flows/` `routes/` `services/` `repositories/` `validators/` `presenters/`

### 6. Security invariants - never break these

- **SSRF**: all outbound user-supplied URLs must pass through `assertSafeUrl()` (`src/lib/url-safety.ts`)
- **Token revocation**: always call `blockJti` AND `revokedJti.create` together
- **RBAC**: never write `role.name === "ADMIN"` - use `requirePermission()` from `src/lib/security/rbac.ts`
- **Federated login auto-link**: must check `emailVerified === true` on the existing identity
- **Crypto algorithm**: never hardcode - read from key record or JWT header via `decodeProtectedHeader`
- **Rate limiting**: every auth-sensitive route sets per-route `config: { rateLimit }`
- **CORS**: restrict to configured origins (`config.base.allowedOrigins`), not `"*"`
- **Current tenantId**: always `request.identity.tenantId` - never `request.identity.currentTenantId` (does not exist)

---

## Verified status - grounded in actual files and tests

### ✅ Done and solid - all verified against source

| Area | Status | Evidence |
|------|--------|----------|
| Auth engine (password, passkey, TOTP, magic-link, social, SAML) | ✅ 100% | `login.flow` (11 tests), `register.flow` (6), `session.service` (12), `passkey-register.flow` (5), `idp.service` (3) |
| OAuth 2.0 / OIDC | ✅ 100% | `token.service` (6), `token-refresh.flow` (9), refresh rotation + kill-chain + expiry vs replay fix |
| PKCE enforcement | ✅ 100% | Mandatory default, exchange-time defense-in-depth |
| JTI blocklist (Redis + DB fallback) | ✅ 100% | `jti-blocklist.*` (14 tests across 3 files) |
| SSRF defense | ✅ 100% | `url-safety` (7 tests), applied on webhooks + IdP metadata URLs |
| Webhook delivery | ✅ 100% | `webhook-config.route` (6 tests), Postgres queue, retry/backoff |
| SD-JWT VC issuance/verify/revoke | ✅ 100% | `verify-credential.flow` (4), `status-list.service` (5), CAS allocation |
| BitstringStatusList | ✅ 100% | `status-list.service.test.ts` - `allocateIndex` with CAS + retry |
| did:web + did:key | ✅ 100% | `provision-tenant-did.flow` (4), `did.route.test` (3), `register-wallet-did.flow` (created) |
| Redis-backed distributed revocation | ✅ **100%** | jti-blocklist (3 files/14 tests): in-memory Map fallback, retries every call. Introspect route: Redis + DB dual check. Login-attempt: no permanent init cache. **Per-session access token revocation**: `AccessToken.sessionId` column added + migration + `DELETE /sessions/:id` now revokes bound access tokens and blocks their JTIs in Redis. Full kill chain: session → refresh tokens → access tokens. |
| Presentation endpoint | ✅ 100% | `jws-proof` (6), `verify-session.route` (5), `verify-present.route` (9) - **20 tests total** |
| Credential offers | ✅ 100% | `offer-credential.flow` (8) + `offer.route` (5) = **13 tests** |
| Multi-tenant CRUD | ✅ 100% | `create-tenant.flow` (7), `add-member.flow` (2), policy enforcement |
| TenantPolicy enforcement | ✅ 6/6 fields | requireMfa, maxSessionsPerUser, sessionTtlMinutes, allowedEmailDomains, allowPasskeys, requireLegalConsent |
| RBAC (requirePermission) | ✅ 100% | `rbac` (5 tests), 22 permissions, 0 `role.name === "ADMIN"` in new code |
| ExternalIdentifier | ✅ 100% | `link/list/unlink` (9 tests), SHA-256 hashed |
| Wallet + identity-owned DID | ✅ 100% | `register-wallet-did.flow` - did:key + Wallet row in same tx |
| KMS (signing key encryption) | ✅ Wired | `kms` (13 tests), called by `key-encryption.ts` → `signing.service.ts` + `provision-tenant-did.flow.ts` |
| Phase 0 bug fixes | ✅ All 7 | Variable alg header, non-custodial DID signing, status-list CAS, email gate, ADMIN_PASSWORD guard, migration folder rename, multibase encoding |
| `aal` in access + id tokens | ✅ 100% | `token.service` (6 tests including aal claim) |
| `preferred_username` in id_token | ✅ 100% | Verified in `token.service.ts` line 183 + test assertion |
| `setUsernameFlow` route | ✅ 100% | Registered in `auth.plugin.ts`, audit-logged, TOCTOU-safe |
| Refresh token expiry vs replay | ✅ Fixed | `token-refresh.flow.ts` Step 2b: expired → clean "re-authenticate", revoked → kill-chain. Tested (9 tests) |
| Email templates | ✅ 13 templates | All registered in `notification.service.ts`, compiled via React Email + Resend |
| CI pipeline | ✅ 3 workflows (rewritten 2026-07-28; CLI gates added 2026-11-05; lint unblocked 2026-11-06) | `ci.yml` (GitHub `ubuntu-latest` runner + `postgres:17-alpine` service container, no external DB: validate → typecheck → lint → `scan:secrets` → Trivy → test → cli:typecheck → cli:build → migrate-rollback guard → build api+web). **Note:** lint ran before test, so a pre-existing lint failure meant CI never reached the test/build steps until 2026-11-06 - `eslint.config.mjs` now ignores generated trees and carries `no-explicit-any` / `no-unused-vars` / `react-hooks/set-state-in-effect` as warnings. |
| `GET /tenants` route | ✅ 100% | `list-tenants.route.ts` - returns all tenants the user has ACTIVE membership in, with role + plan |
| SDK layer | ✅ **Migrated to `@fusorb/facet-sdk@4.0.1`** | `src/sdk/` is now `index.ts` only - an `SgClient` singleton (401 auto-refresh wired to the Zustand auth store) re-exporting the facet domain SDK classes (`AuthSdk`, `TenantSdk`, `VcSdk`, …). Old factory-pattern `src/sdk/*.sdk.ts` deleted (2026-08-05); the three contract adapters (`externalIds`, `devices`, `policies`) were **deleted** on the 4.0.0 bump (2026-11-13), which fixes every drift they covered - only the `apiKeys` adapter remains (upstream ships no `ApiKeySdk`; P1-2). Sets `fetchInit.credentials = "include"` so the httpOnly refresh cookie is actually stored and sent. |
| UI components | ✅ **Migrated to `@fusorb/facet-components@3.2.2`** | shadcn/ui primitives purged; consumers use the package's native `<Icon name=… />` registry. The 3 temporary app-specific wrappers (`icon.tsx`, `typewriter-text.tsx`, `icons.generated.tsx`) were **deleted** in the F1 teardown (2026-11-11) - `src/components/` now holds only `stub-page.tsx` + `public-navbar.tsx`. |
| Auth UI | ✅ **Migrated to `@fusorb/facet-auth@2.1.2`** | Login/register/mfa pages use `SignIn`/`SignUp`/`MfaDialog`; `SgProvider` bridged to the Zustand store via `zustandTokenStorage` (commit `d6f6707`). In-repo `login-form`/`register-form`/`mfa-form` deleted; forgot/reset password forms now on `@fusorb/facet-auth` (ForgotPasswordForm/ResetPasswordForm). |
| Layout | ✅ **Migrated to `@fusorb/facet-layout@1.7.2`** | `(auth)` group uses `AuthLayout`, `console/` directory uses `ConsoleLayout`; in-repo sidebar/topbar/tenant-switcher deleted. |
| CSS tokens | ✅ **Migrated to `@fusorb/facet-tokens@1.5.1`** | `tokens.css` imported before `globals.css` in `layout.tsx`; `:root` block removed from globals.css; sovgrant keeps its indigo primary via override. |
| Mail templates | ✅ **Migrated to `@fusorb/facet-emails@1.1.4`** (Phase 7) | `src/core/mail` rewired to `toTemplateTree`/`EmailBrand`; 13 templates via facet-emails; preview server on `:3888`. |
| Stores | ✅ **Migrated to `@fusorb/facet-store@1.0.6`** (Phase 8) | `src/store/` deleted; `useAuthStore`/`useTenantStore` from `@fusorb/facet-store` across ~26 hook sites. |
| Tenant store hydration | ✅ **Fixed (2026-11-11)** | `AuthBootstrap` (mounted ABOVE `SgProvider`) exchanges the httpOnly refresh cookie for an access token before the provider mounts, then `SessionBootstrap` hydrates `useTenantStore` once a token exists. Before this, no access token could be obtained after a reload at all, so hydration silently no-oped and every later call 401'd - see **P0-4/P0-7** in `.agent/output.txt`. |
| Tenant switcher UI | ✅ Built | `TenantSwitcher` component in Topbar - visible when user has 2+ tenants, triggers context switch |

### 🔵 Status - working tree (2026-08-21)

| Priority | Item | Why now |
|----------|------|---------|
| **P0** | Facet migration Phases 0–8 + Phase E | **Phases 0–8 + Phase E done (2026-08-19).** Phase 1: `src/sdk/` is a thin `SgClient` singleton wiring over `@fusorb/facet-sdk@4.0.1`. Phase 2: `@fusorb/facet-tokens/tokens.css` imported before `globals.css` in `layout.tsx`. Phase 3: shadcn/ui primitives purged from `src/components/ui/` (3 app-specific wrappers retained); all consumers import `@fusorb/facet-components@3.2.2`. Phase 4: auth pages on `@fusorb/facet-auth@2.1.2` via `SgProvider` + `zustandTokenStorage` bridge (commit `d6f6707`). Phase 5: layouts on `@fusorb/facet-layout@1.7.2`. **Done:** Phase 6 purge FULLY complete — forgot/reset password forms now on `@fusorb/facet-auth`; `src/components/auth/` + `src/components/layout/` deleted; shadcn/ui primitives purged from `src/components/ui/` (3 app-specific wrappers retained) (2026-08-19). |
| **P1** | Phase 3 - Security hardening | **✅ Closed (2026-07-28).** SSRF (4/4 fixed), CSRF review complete, Redis-backed distributed revocation wired. **Per-session access token revocation**: `AccessToken.sessionId` column + migration + `DELETE /sessions/:id` revokes bound access tokens + blocks JTIs in Redis. Full kill chain: session → refresh → access tokens. JTI blocklist (14 tests, 3 files): in-memory Map fallback, retries every call. Introspect route: Redis + DB dual check. |
| **P2** | Phase 4 - Observability | **✅ Shipped (2026-07-28).** `requestId` in all error responses + audit log metadata. `@fastify-metrics` at `GET /metrics`. Correlation IDs flow through FlowContext.requestId → auditService.log → DB. Pino structured logs carry traceId on every flow init/ok/fail. |
| **P3** | CLI + SDK packages | Phase 1 implemented in `packages/cli` (`@fusorb/sg-cli`, bin `sg`): init/doctor/migrate/setup/revert, Postgres + Cockroach adapters, safe overwrite/revert, secret gen, --dry-run/--force/--yes. 10 tests passing. Phase 2 pending. |
| **P4** | LegalConsent → wire to flow | **✅ Done (2026-08-19).** LegalConsent gate wired into `issue-credential.flow.ts` (E2, lines 62-78) — checks `TenantPolicy.requireLegalConsent` + `legalConsent` table before issuing; throws 403 if no consent recorded. |
| **P5** | ExternalIdentifier.verified → VC issuance | **✅ Done (2026-08-19).** Verified-identifier gate wired into `issue-credential.flow.ts` (E1, lines 52-60) — subject DID must resolve to an `Identity` with ≥1 verified external identifier (`where: { identityId, verified: true }`). |
| **P4.1** | Dead audit enum values | **✅ Done (2026-08-22).** `ROLE_*` + `DELEGATION_*` removed from `AuditLogAction`; migration `20260822000000_remove_dead_audit_enum_values`. The two `API_KEY_*` values were later added for API-key auditing, so the enum currently holds **53** values. `OAUTH_CLIENT_UPDATED` audit call wired in `clients.route.ts`. 100% call-site coverage. |
| **P4.2** | CI secret + dependency scanning | **✅ Done (2026-08-19).** `scan-secrets.ts` wired to CI (`pnpm scan:secrets` in ci.yml); Trivy dependency/vuln scan added to ci.yml. Secrets/PII-in-logs now scanned in CI. |
| **P4.3** | SDK `TenantSdk.create()` coverage | ⏸️ **Carried to v2.** `sdk.test.ts` (6 tests) doesn't cover `TenantSdk.create()` or its token-injection fix; no changeset. Low-risk gap, not blocking v1. |
| **P4.4** | Frontend chain-rule violations | **✅ Done (2026-08-21).** Verified: NO `src/app` page imports the sovgrant SDK (`@/sdk`) directly - only `use-*` hooks + `facet-store` hooks + facet UI (`login`/`register` on `@fusorb/facet-auth`, `billing` via `useBilling()`). `src/components/` purged to facet (no frontend `as any`). Chain rule (page → hook → store → SDK) enforced. |

### 🔶 Deferred (do not start early)

- BBS+/selective disclosure beyond SD-JWT - SD-JWT VC is correctly implemented now
- `did:jwk` - `did:key` is sufficient for wallet-originated DIDs
- Full OIDC4VCI/OIDC4VP - revisit when SovPort is live and external consumers exist
- OPA/Cedar policy engine, SCIM, Terraform provider - all v2+
- Identity-scoped signing key (non-custodial by design - abandoned per architecture decision)

---

## Test coverage detail

### 74 test files, 408 tests - modules with coverage

> All 74 files pass on `pnpm test`. Typecheck clean (`tsc --noEmit`).

| Module | Test files | Tests | Coverage breadth |
|--------|-----------|-------|-----------------|
| `auth` | 15 | 80 | All 13 flows covered (login, register, logout, email-verify, magic-link, mfa-setup/verify, passkey-register/auth, password-reset-request/confirm, set-username, switch-context) + session.service + `session.route` (DELETE /sessions/:id) |
| `credentials` | 10 | 69 | issue/verify/offer/revoke/list flows + route-level (offer, list, verify-session, verify-present) + status-list service |
| `oauth` | 8 | 60 | authorize.flow, token-exchange.flow, token-refresh.flow, token-revoke.flow, revoke-token-by-id.flow + token.service + `jwks.route` (relying-party verification contract) + `introspect.route` (RFC 7662 caller auth) |
| `tenant` | 7 | 28 | create-tenant, add-member, remove-member, provision-tenant-did + did.route + cross-tenant-isolation (HTTP + unit) |
| `identity` | 10 | 49 | register-wallet-did, delete-account, update-profile, link/list/unlink-external-id, verify-identifier, confirm-identifier, approve-device-approval + external-id.verify route |
| `api-key` | 4 | 16 | api-key.service + create/list/revoke flows |
| `idp` | 1 | 3 | federatedLogin service |
| `billing` | 1 | 11 | subscription.route (Paystack + Stripe webhooks) |
| `audit` | 1 | 3 | query-audit-logs flow |
| `webhooks` | 1 | 6 | webhook-config route |
| `lib/*` | 8 | 55 | url-safety, rbac, password-rules, jws-proof, jti-blocklist (3 files, inc. Redis), kms |
| `api/plugins` | 2 | 8 | `auth-guard.plugin` (token-type discrimination, jti revocation) + `rate-limit.plugin` (verified keying, 429 shape) |
| `test-utils` | 2 | 5 | test-infra + sanity |
| `packages/cli` | 3 | 10 | safe-writer (6), init round-trip (2), detection (2) |
| `prisma/migrations` | 1 | 5 | `rollback.test.ts` (migration chain integrity) |

### Modules with zero test coverage (14 files, all low-to-medium risk)

| File | Risk | Notes |
|------|------|-------|
| `auth/services/mfa.service.ts` | Medium | Tested indirectly via mfa-setup.flow.test + mfa-verify.flow.test (11 tests combined) |
| `auth/services/passkey.service.ts` | Medium | Tested indirectly via passkey-register.flow.test + passkey-authenticate.flow.test (11 tests) |
| `auth/services/password.service.ts` | Low | Thin argon2 wrapper, tested via register + login flows (17 tests) |
| `auth/services/step-up.service.ts` | Low | Elevation logic tested via mfa-verify + switch-context flows |
| `credentials/services/signing.service.ts` | Medium | SD-JWT dispatcher, tested via issue-credential.flow.test (12 tests) |
| `credentials/services/did.service.ts` | Low | did:web construction, tested via did.route.test + provision-tenant-did.flow.test |
| `identity/routes/admin.route.ts` | Medium | Identity status management, SYSTEM-ADMIN gated |
| `identity/routes/profile.route.ts` | Low | Tested via update-profile + delete-account flows |
| `identity/routes/delegation.route.ts` | Low | Simple CRUD |
| `tenant/services/membership.service.ts` | Low | Tested via add-member + remove-member flows |
| `tenant/services/onboarding.service.ts` | Low | Tenant onboarding |
| `tenant/services/project.service.ts` | Low | Tested via create-tenant flow |
| `tenant/services/tenant.service.ts` | Low | Tested via create-tenant flow |
| `webhooks/routes/webhook.route.ts` | Low | Inbound ingestion endpoint (webhook-config.route.test covers config only) |

### Security gaps (unverified or missing)

| Check | Status | Detail |
|-------|--------|--------|
| Cross-tenant isolation (HTTP + unit) | ✅ **Verified** | `cross-tenant-http.test.ts` - 3 HTTP-layer tests. `cross-tenant-isolation.test.ts` - 3 flow-level unit tests (mock fixed: `upsert`/`findMany`/`findUniqueOrThrow` + `auditLog.create`). All 6 tests pass clean with no audit-noise errors. |
| Rate limiting per route | ✅ Verified | Every auth-sensitive route has `config: { rateLimit }` - login (10/min), register (5/hr), magic-link (3/15min), MFA (5/5min), password (5/15min), step-up (5/5min), verify-session (30/min), verify-present (30/min) |
| Audit logging - called actions | ✅ 100% | 53 enum values in `AuditLogAction` (`ROLE_*` + `DELEGATION_*` removed; `API_KEY_*` added). Call sites verified for all actions. `OAUTH_CLIENT_UPDATED` audit call wired in `clients.route.ts`. `PASSWORD_RESET_REQUESTED` audit call was missing - added. `magic-link.flow.ts` had zero audit calls - `SESSION_CREATED` + `USER_LOGIN_SUCCESS` added. |
| Secrets/PII in logs | ✅ **Verified** | `scan-secrets.ts` runs in CI (`pnpm scan:secrets`) - scans source/log strings for plaintext credentials and PII |
| CORS config | ✅ Verified | Restricted to `config.base.allowedOrigins` (env-driven), not wildcard |
| Token revocation (blockJti + revokedJti) | ✅ **Verified** | Both called together in all revoke paths. Introspect route now checks Redis + DB (was DB-only). |
| JTI blocklist - in-memory fallback | ✅ **Verified** | `jti-blocklist.ts`: in-memory `Map` with TTL expiry, retries Redis every call (no permanent `_initFailed`). Matches `challenge-store.ts` pattern. 14 tests across 3 files. |
| Login-attempt - no permanent init cache | ✅ **Fixed** | `login-attempt.ts`: removed `_initFailed`, retries Redis every call. Same pattern as `challenge-store.ts`. |
| SSRF allowlist (network-level) | ✅ **Verified** | `assertSafeUrl()` already has full network-layer private-IP blocks (RFC1918, loopback, link-local, CGNAT, IPv6 ULA) + DNS rebinding defence + `fetchWithSsrfGuard` redirect protection - verified 2026-07-26 |
| CSRF protection | ✅ **Verified** | Only cookie-mutating routes are OAuth state cookies in `social.route.ts` - all `sameSite: "lax"` + `httpOnly` + `secure` + 600s TTL + cleared after use. All other routes return tokens in JSON body (no cookies). CORS restricted to `config.base.allowedOrigins`. |
| Docker compose | ✅ **Exists** | `docker-compose.yml` - 4 services (postgres 17-alpine, redis 7-alpine, api, workers) with health checks + mem limits |
| Integration tests against real Postgres | ✅ **Unblocked (facet shipped 2026-08-19)** | All tests are unit/mock-level with `createMockDb`; route-level tests run against `fastify.inject()` with a mock DB, covering the full API surface. No longer blocked by facet shipping; requires `testcontainers` or enhanced CI service container config |
| Migration rollback test | ✅ **Exists** | `rollback.test.ts` (Tier-1, runs in `pnpm test`) + `pnpm test:rollback` opt-in (Tier-2, needs live Postgres) |
| Dependency/secret scanning in CI | ✅ **Verified** | `ci.yml`: Trivy dependency/vulnerability scan + `pnpm scan:secrets` (secrets/PII) on every run |
| Production Dockerfile | ✅ **Exists** | Multi-stage (deps → builder → runner), node:22-alpine, auto-migrate entrypoint, 150MB |
| Token-type confusion (ID token as bearer) | ✅ **Fixed (2026-11-13)** | Access and ID tokens share a signing key; the guard now requires `token_use: "access"` (stamped by `TokenService.issue`). Without it an ID token (1h TTL, not covered by logout revocation) passed as an access token. `src/api/plugins/auth-guard.plugin.test.ts` (5 tests). |
| Rate-limit keying from unverified claims | ✅ **Fixed (2026-11-13)** | `keyGenerator` verifies the Bearer token before trusting `sub`/`tid`; forged tokens fall back to IP keying. Also fixed: the exceeded-path threw a plain object, so every rejection returned **500 instead of 429** - it now throws `ApiError.tooManyRequests`. `src/api/plugins/rate-limit.plugin.test.ts` (3 tests). |
| RFC 7662 introspection caller auth | ✅ **Fixed (2026-11-13)** | Basic credentials verified against the Client row (argon2 `clientSecret`); public clients rejected. Also fixed: `aud` was sent as the stored JSON array against a string schema, 500-ing every live-token introspection - now space-joined. `src/modules/oauth/routes/introspect.route.test.ts` (7 tests). |

---

## Versioning

Current: `0.1.0` (package.json). Pre-release - no stability promises.

- `0.1.0` ✅ **COMPLETE** (v1) - Backend complete: all Phase 0–8 + Phase E shipped; 74 test files / 408 tests, 0 code failures. Docker, security hardening, observability, LegalConsent + ExternalIdentifier gates all shipped. Guard-level security pass 2026-11-13: P0-8 (token-type discrimination), P0-9 (rate-limit keying + real 429s), P0-10 (introspection caller auth).
- `0.2.0` 🔄 **ACTIVE (v2)** - SovPort companion app integration (end-to-end), CLI package extraction, integration tests against real Postgres. **API key management backend ✅ Done** (CRUD flows + routes, SHA-256 hashed bearer tokens, auth guard extension, migration + Tier 1 rollback tests).
- `1.0.0` — Stable production milestone: full integration test suite, open-source release

_The v1 roadmap was closed (2026-08-22). Active track: `docs/planning/sovgrant-v2-roadmap.md`._


---

## Mail templates - full inventory

13 templates in `src/core/mail/templates/`, all registered in `src/lib/notifications/notification.service.ts`:

| Template | Trigger | Wire call site |
|----------|---------|----------------|
| WelcomeMail | Post-email-verification | register.flow.ts |
| VerifyEmailMail | Registration | notification service |
| MagicLinkMail | Magic link request | auth service |
| PasswordResetMail | Password reset request | auth service |
| PasswordChangedMail | Password changed | auth service |
| MfaCodeMail | MFA verification code | auth service |
| RecoveryCodesIssuedMail | MFA setup complete | auth service |
| MfaDisabledAlertMail | MFA disabled | mfa-setup.flow.ts |
| NewDeviceLoginMail | New device sign-in | auth service |
| AccountSuspendedMail | Account suspended | admin.route.ts |
| AccountDeletionMail | Account deleted | delete-account.flow.ts |
| TenantInviteMail | Tenant member added | add-member.flow.ts |
| CredentialIssuedMail | Credential issued | issue-credential.flow.ts |

**No gaps** - every common auth/billing email type is covered.

SMS: transactional MFA codes + security alerts via Brevo (`sendMfaCodeSms`, `sendSecurityAlertSms`).

---

_Keep this file current. Any session that closes an item or discovers a new one
updates CLAUDE.md and docs/planning/sovgrant-v2-roadmap.md in the same commit._
