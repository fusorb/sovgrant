# SovGrant - Agent Instructions

> Loaded automatically every session. For the full handbook - status tables,
> rationale, and open work queue - see `CLAUDE.md` in this same root.
> This file is the compressed, always-loaded version of those same rules.
> If the two ever disagree, `CLAUDE.md` is the source of truth; fix this
> file to match it, not the other way round.

## What this is

SovGrant: sovereign multi-tenant identity/IAM backend. Fastify + Prisma + Next.js
16 monorepo. OAuth2/OIDC provider, WebAuthn passkeys, TOTP MFA, SD-JWT
Verifiable Credentials, did:web, multi-tenant policy/RBAC, webhook delivery.
Version `0.1.0` in package.json (pre-release, no stability promises).

Package manager is **pnpm**. Module system is **ESM only** (`"type": "module"`
in package.json) - never emit `require()`/`module.exports`.

**Test suite:** 71 files / 393 tests / 0 code failures on `pnpm test` (all passing clean on Windows; the count includes the 10 `packages/cli` tests - route-level + Prisma imports dominate). Migration-rollback Tier-2 is opt-in via `pnpm test:rollback` (needs a live Postgres **and** a shadow DB). Typecheck clean (`tsc --noEmit`); lint clean (0 errors, 411 warnings). Updated 2026-11-11 - down from 70/386, because the frontend teardown removed `src/sdk/sdk.test.ts`, then up again as `src/modules/oauth/routes/jwks.route.test.ts` landed. Lint re-measured 2026-11-13 at 411 (was 413) after the facet-sdk 4.0.0 adoption - the four files that change touched report no warnings themselves.

## Non-negotiable architecture rules (same - stable)

1. **Business logic lives in Flows, never in routes.** `src/modules/<n>/flows/`.
   Routes are thin: auth guard → validate → `FlowExecutor.execute()` → reply.
2. **Errors are always `ApiError` static helpers.** Never `throw new Error()`.
3. **DB access**: inside a flow, always `ctx.db` (transaction-scoped). Inside
   a route directly, `fastify.db`. Never `import prisma` inside a flow.
   Always use `select` projections.
4. **Auth guards** via `preHandler`: `fastify.auth.requireUser`,
   `requireAal2`, `requireElevated`, `requirePlan("PRO")`,
   `requireScope("credential:issue")`. `request.identity.tenantId` exists;
   `request.identity.currentTenantId` does **not** - never reference it.
5. **Module shape** - every domain module under `src/modules/<n>/` owns
   `flows/ routes/ services/ repositories/ validators/ presenters/`.
6. **Frontend never calls the API directly.** Chain is always
   `page → component(s) → hook (use-*.ts) → Zustand store → SDK (src/sdk/index.ts, facet-sdk classes) → API`
7. **Tenant scoping**: every tenant-scoped query filters on `tenantId` taken
   from `req.params.tenantId` validated against membership - never trust
   `req.body.tenantId`.
8. **Security invariants** - never break these:
   - Any outbound fetch to a user-supplied URL passes through
     `assertSafeUrl()` first - no exceptions.
   - Access-token revocation always calls `blockJti` **and**
     `revokedJti.create` together - never one without the other.
   - New `TenantPolicy` fields must ship with their enforcement in the
     relevant flow in the same change.
   - Never hardcode a crypto algorithm - read it from the key or JWT header.
   - Federated login auto-link gated on `emailVerified === true` - both
     `social.route.ts` and `idp.service.ts` enforce this.
   - Approving a device approval requires proof-of-possession: the approving
     device must sign the challenge with the Ed25519 key matching the
     `PairedDevice.publicKey` it registered, and that row must be the caller's
     own, unrevoked and trusted (`verifyEd25519Signature` in
     `approve-device-approval.flow.ts`). A bare `deviceId` is never sufficient.
   - The refresh token is an httpOnly cookie: the SDK client must send
     `credentials: "include"` (set via `fetchInit` in `src/sdk/index.ts`), or
     the cookie is neither stored nor sent and the whole refresh path is inert.

## File naming

`<n>.flow.ts` · `<n>.route.ts` · `<n>.service.ts` ·
`<n>.repository.ts` · `<n>.schemas.ts` · `<n>.presenter.ts` ·
`<n>.test.ts` (co-located with source) · `use-<n>.ts` (hooks) ·
`<n>.store.ts` · SDK classes live in `@fusorb/facet-sdk`

## Before writing any code, check

1. Does a flow already exist for this? `src/modules/*/flows/`.
2. Does the Prisma model already have the columns needed? `prisma/schema.prisma`.
3. Does the route already exist? `src/modules/*/routes/`, `src/api/routes/`.
4. Is there a matching case in `docs/planning/testing-guide.MD`? Match the
   request shape exactly.
5. Is this tenant-scoped? If so, does it need a `TenantPolicy` check?

## Current status

**Backend complete (0.1.0 equivalent).** All Phase 0 bugs fixed, all Phases 1–2
shipped. See `CLAUDE.md` for the full verified status table. Open work:

- **Docker deployment** - ✅ Done. Multi-stage `Dockerfile` (node:22-alpine),
  `docker-compose.yml` (Postgres 17 + Redis 7 + API + workers), `.dockerignore`,
  auto-migrate entrypoint, `.env.example`. `docker compose up -d` to run.
- **Frontend rebuild** - F1–F4 landed 2026-11-11; **F5 (page wiring) is the only
  open part**.
  - **F1 teardown** (`f334674`): the pre-facet surface is deleted - legacy page
    components, the 16 in-repo hooks, the in-repo SDK and its test, provider
    wrappers (incl. `AuthProvider`), and the local icon / table / shell
    components.
  - **F2/F3 foundation + route map** (`1729f8a`): brand + nav config, provider
    wiring, and the App Router route map scaffolded as `StubPage` stubs
    (public / auth / console / invites / oauth).
  - **F4 hooks** (`c318198`): one hook per backend domain (24 files) plus
    `use-api-guard`, which centralises the "no session token -> 401" contract.
    `src/hooks/` is the only layer that imports `@/sdk` - that is what enforces
    page → component → hook → store → SDK → API.
  - **Provider stack**: `ThemeProvider → AuthBootstrap → SgProvider →
    SessionBootstrap → children + Toaster`. **`AuthBootstrap` must stay ABOVE
    `SgProvider`**: `SgProvider` only attempts the refresh-cookie exchange when
    its storage already holds an access token, so no component inside it can
    bootstrap a session after a reload (P0-4/P0-7 in `.agent/output.txt`).
  - **F5 (open)**: page-by-page component wiring for the 40 stubs.
- **Facet migration** - ✅
  **Phases 1–5 done.** Phase 1: SDK migrated to the published
  **`@fusorb/facet-sdk@2.1.1`** - `src/sdk/index.ts` is a thin
  singleton wiring that owns the `SgClient` + 401 auto-refresh (wired
  to the Zustand auth store) and re-exports the facet domain SDKs; the
  old in-repo factory-pattern `src/sdk/*.sdk.ts` files are deleted.
  Phase 2: `@fusorb/facet-tokens/tokens.css` imported before
  `globals.css` in `layout.tsx`; `:root` token block removed from
  globals.css. Phase 3: `src/components/ui/` purged entirely - the 3 temporary app-specific wrappers (`icon.tsx`, `typewriter-text.tsx`, `icons.generated.tsx`) were deleted in the F1 teardown; all consumers
  switched to **`@fusorb/facet-components@3.2.1`** (icons use the
  package's native `<Icon name="…" />` registry - no local icon registry).
  Phase 4: auth pages on **`@fusorb/facet-auth@2.1.0`** via `SgProvider` +
  `zustandTokenStorage` bridge (commit `d6f6707`); in-repo
  `login-form`/`register-form`/`mfa-form` deleted.
  Phase 5: layouts on **`@fusorb/facet-layout@1.7.2`** (`AuthLayout` +
  `ConsoleLayout`). Phase 6 purge is FULLY done (2026-08-19) - `src/components/auth/` deleted;
  `forgot-password-form`/`reset-password-form` now on `@fusorb/facet-auth` (ForgotPasswordForm/ResetPasswordForm).
All seven facet packages pinned (exact): sdk 2.1.1, auth 2.1.0, components 3.2.1,
   layout 1.7.2, tokens 1.5.1, emails 1.1.4, store 1.0.4.
   `@fusorb/facet-cli` is **not** a per-repo dependency — it is installed
   globally on the machine as a universal tool, so it never appears in
   `package.json`/`node_modules`. `packages/cli` (`@fusorb/sg-cli`) is standalone
   (commander + clack) and does **not** consume facet-cli's command core.
   `@fusorb/facet-docs` was dropped (installed with zero imports) — it appears
   nowhere in `package.json`/`pnpm-lock.yaml`.
- **Phase 3 - Security hardening** - ✅ **Closed (2026-07-28).** Cross-tenant HTTP integration test added (3 tests, fastify.inject, passes). SSRF call-site gaps (4/4 closed: idp.route OIDC discovery + token endpoint, webhook test-ping, SAML entryPoint). CSRF review complete - only OAuth state cookies in social.route.ts, all `sameSite: "lax"` + `httpOnly` + `secure`. Redis-backed distributed revocation done - `AccessToken.sessionId` column + migration + `DELETE /sessions/:id` revokes bound access tokens + blocks JTIs in Redis (full kill chain).
- **Phase 4 - Observability** - ✅ **Shipped (2026-07-28).** Correlation IDs through `FlowContext.requestId` → audit log metadata. `@fastify-metrics` at `GET /metrics`. Pino structured logs carry traceId on every flow init/ok/fail.
- **CLI package** - Phase 1 implemented in `packages/cli` (`@fusorb/sg-cli`,
  bin `sg`): init/doctor/migrate/setup/revert, Postgres + Cockroach adapters,
  safe overwrite/revert, secret generation, --dry-run/--force/--yes. 10 tests
  passing. Phase 2 (Mongo/Mongoose/Dynamo + auth-UI scaffolding) pending.
  SDK consumed as published `@fusorb/facet-sdk@2.1.1`.
- **LegalConsent** - ✅ Done (2026-08-19): gate wired into `issue-credential.flow.ts` (E2) — VC issuance blocked when the tenant policy requires consent and none is recorded.
- **ExternalIdentifier.verified → VC issuance** - ✅ Done (2026-08-19): gate wired into `issue-credential.flow.ts` (E1) — subject DID must resolve to an Identity with ≥1 verified external identifier before issuance.
