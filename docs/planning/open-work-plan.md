# SovGrant — Open Work Plan (handoff)

> **What this is:** the sequenced, actionable version of the open items.
> `.agent/output.txt` remains the status truth (what is P0/P1, what is done, the
> evidence); this file is the *how* — acceptance criteria, dependencies, owners —
> so the work can be picked up without re-deriving it.
>
> Last updated 2026-11-14 (F5 complete; SDK pin `4.1.0`; P1-1 tenant + identity slices landed; full suite re-measured 81/424).

## Ground rules (do not re-litigate)

- Read `AGENTS.md` first; `CLAUDE.md` is the fuller handbook and wins on conflict.
- Architecture rules are non-negotiable: business logic in `flows/` never routes;
  errors are `ApiError` statics; flows use `ctx.db`, routes use `fastify.db`;
  `select` projections always.
- Frontend chain: `page → component(s) → hook → store → SDK → API`. `src/hooks/`
  is the only feature layer that imports `@/sdk`; the four bootstrap provider
  files also call it, by design, because they must run above `SgProvider`.
- **Never write test counts without re-running the suite.** Current verified:
  81 files / 424 tests / 0 failures; typecheck clean; lint 0 errors.
- **Never hand-copy an enum's value list** — diff it (`prisma migrate diff`).

---

## CI-1 — activate the migration drift guard ✅ DONE (2026-11-11)

`ci.yml` ran `pnpm test:rollback` without `ARC_ID_ROLLBACK_TEST=1`, so only the
static Tier-1 checks ran — the step was green on every push while checking nothing
that could catch drift. That is how P0-5 survived.

**Done:**
- `ARC_ID_ROLLBACK_TEST: "1"` and the job-level `SHADOW_DATABASE_URL` added to
  `.github/workflows/ci.yml`, plus a step running `node scripts/create-shadow-db.mjs`
  (the service container only creates `DATABASE_URL`'s database, and
  `migrate diff --from-migrations` requires the shadow DB to already exist).
- The helper is idempotent and mirrors `prisma.config.ts`'s shadow resolution, so
  local and CI agree. Verified locally: create, re-run (no-op), and the guard
  passing with the flag (5/5).

**Acceptance:** met locally. First CI run on push is the remaining confirmation —
if the step fails, read the guard's own assertion message before anything else.

---

## F5 — wire the 40 stub pages ✅ DONE (2026-11-14)

All 40 stub routes were wired to facet packages (`@fusorb/facet-components`,
`@fusorb/facet-layout` `PageHeader`, `@fusorb/facet-auth` `useAuth`) + existing hooks,
preserving `page → view → hook → store → SDK → API` (no `@/sdk` in route views/pages).
0 `StubPage` references remain in `src/app/**`; `src/components/stub-page.tsx` was
deleted in F1's teardown follow-up (commit `1b7d676`). `pnpm typecheck` clean.
Full suite re-measured 2026-11-14: **81 files / 424 tests / 0 failures**.

---

## P1-1 — move business logic out of fat routes (L)

Routes violating rule #1 begin with: `tenant/routes/{did,signing-key,membership,
policy,invite,tenant}.route.ts`, `identity/routes/{profile,admin}.route.ts`,
`auth/routes/{password,session,mfa,passkey,magic-link,social}.route.ts`,
`oauth/routes/{clients,tokens}.route.ts`, `webhooks/routes/webhook-config.route.ts`,
`idp/routes/idp.route.ts`.

**Reference pattern:** `credentials/*`, `audit/*`, `auth/login`.

**Status (2026-11-14):** tenant slice done (`7b65a3a` project, `6202480` did/tenant/policy/list-tenants, `afbd84a` invite+membership, `244de09` signing-key, `1037e86` onboarding) and identity slice done (`aaacce6` profile/admin + 6 flows + colocated tests). `FlowContext.requestId` now propagates guards' `req.id` into audits. Colocated tests written for all six new identity flows (11 tests) following the existing mock-db pattern (ApiError paths + every model read/written + revocation quadruple + revokedJti TTL from `expiresAt`). Full suite re-measured: 81/424 green.

**Remaining fat routes to migrate (same pattern, highest-risk first):**
`auth/routes/{password,session,mfa,passkey,magic-link,social}.route.ts` (~700 for social),
`oauth/routes/{clients,tokens}.route.ts`, `webhooks/routes/webhook-config.route.ts`,
`idp/routes/idp.route.ts`.

**Acceptance (unchanged):** each listed route is a thin guard → validate → `FlowExecutor.execute()` → reply; logic in `flows/` with DB via `ctx.db`; existing tests stay green; new flow tests where behaviour was previously untested.

---

## SDK-1 — adopt `@fusorb/facet-sdk` 4.0.0/4.1.0 — DONE (2026-11-13 / 2026-11-14)

The SDK published **4.0.0**, not the 3.0.0 this plan expected — and that mattered:
3.0.0 fixed only part of the drift (`confirmExternalId` still posted
`{ verification }` instead of `{ code }`, and `getPolicy` was still typed non-null),
so deleting the adapters on that bump would have shipped two broken calls. The
published `dist` was re-checked first; see
`../facet/docs/planning/sdk-canonical-fix-plan.md` G11–G14 and the P1-4 entry in
`.agent/output.txt`.

**Done (4.0.0, 2026-11-13):**
1. Exact pin bumped `3.0.0` → `4.0.0`.
2. The three adapters (`externalIds`, `devices`, `policies`) are **deleted** from
   `src/sdk/index.ts`; `use-external-ids` / `use-devices` / `use-policy` call
   `IdentitySdk` / `TenantSdk` directly. `ExternalIdType` stays as an app-side union,
   because the SDK types the identifier type as a plain `string` while the route
   accepts exactly six values.
3. `approveDeviceApproval` is in use — in **SovPort**, which is already on 4.0.0.
4. SovPort's raw-fetch workaround is already gone (no `fetch(` under its `src`).

**Done (4.1.0, 2026-11-14):** `@fusorb/facet-sdk@4.1.0` is published/installed; the
interim `apiKeys` adapter in `src/sdk/index.ts` and `src/hooks/use-api-keys.ts` was
replaced with `ApiKeySdk` (P1-2 closed in-repo). `pnpm typecheck` clean.

---

## P1-2 — `ApiKeySdk` upstream — DONE (2026-11-14)

Upstream built and committed as facet `5af9c0a` (`ApiKeySdk`: list/create/revoke +
types + 4 body-asserting tests). `@fusorb/facet-sdk@4.1.0` is published/installed in
this repo; the interim `apiKeys` adapter was removed from `src/sdk/index.ts` and
`src/hooks/use-api-keys.ts` now uses `ApiKeySdk`/`CreateApiKeyParams`. `pnpm typecheck`
clean on 2026-11-14.

## P1-3 — delegation (deferred by design, do not resurrect as-is)

`AccessDelegation` was dropped by migration `20261111000000` because nothing
enforced it. If built, it must be **client-anchored token exchange** (RFC 8693)
enforced in the token flows. The four design questions are in
`identity/routes/delegation.route.ts`.

---

## OPS-1 — decide on pushing (owner: user)

**sovgrant has been pushed and is now 3 commits ahead of origin** (`fc36a7d`
pnpm bump, `1b3210c` facet-sdk 4.0.0 + adapter deletion, `dcda05b` lint-count
docs) — push when ready. `../facet` is outside this tree, so its ahead/behind
state is not verifiable from here; its `ci` job passes thanks to the changesets.

## OPS-2 — loose ends from the 2026-11-11 DB pass (owner: user)

- **A pre-migration `pg_dump` of `sg`** was taken to the *session scratchpad*, which
  is session-scoped. If a durable copy is wanted (the migrations are applied and
  verified, so this is belt-and-braces), move it somewhere permanent now.
- **`sg_shadow` was created locally** by hand; `scripts/create-shadow-db.mjs` now
  does it properly, so nothing to undo.
- The tracker's own rule: any count or status claim in `CLAUDE.md` / `AGENTS.md` /
  `README.md` must be re-verified before it is repeated.

---

## Owners

| Item | Owner | Blocked by |
|---|---|---|
| CI-1 | done | — |
| F5 | done (2026-11-14) | — |
| P1-1 | agent (large) | — |
| SDK-1 | done | — |
| P1-2 | done (2026-11-14) | — |
| P1-3 | product decision | design questions unanswered |
| OPS-1 / OPS-2 | user | — |

## Session notes

- 2026-11-14 (F5 complete + P1-1 identity slice): **F5 done** (`1b7d676`) - all 40 stub routes wired to facet packages + existing hooks, 0 `StubPage` references, `stub-page.tsx` deleted. **P1-2 closed** by adopting published `@fusorb/facet-sdk@4.1.0` (`ApiKeySdk` wired into `src/sdk/index.ts`; `use-api-keys` on `CreateApiKeyParams`). **P1-1 tenant slice** landed (`7b65a3a` project, `6202480` did/tenant/policy/list-tenants, `afbd84a` invite+membership, `244de09` signing-key, `1037e86` onboarding); **P1-1 identity slice** landed (`aaacce6`): profile + admin routes thin, six new flows, colocated tests written for all six (11 tests) after the user called out their absence. `FlowContext.requestId` now propagates `req.id` into audits. **Full suite re-measured: 81 files / 424 tests / 0 failures; `pnpm typecheck` clean (user-run, 2026-11-14).** Appended EP 18 to `.agent/episodes.md`. **Next:** continue P1-1 with `auth/routes/{password,session,mfa,passkey,magic-link,social}` (social ~700 first), keeping the same careful per-slice verify-then-commit rhythm.
- 2026-11-14 (sync + SDK adoption): reconciled the local 4.0.1/4.1.0 drift after
  confirming `@fusorb/facet-sdk@4.1.0` is published/installed — `package.json`,
  lock, and workspace are aligned on 4.1.0, the interim `apiKeys` adapter was
  replaced with `ApiKeySdk` in `src/sdk/index.ts` + `src/hooks/use-api-keys.ts`,
  and the living docs (`AGENTS.md`, `CLAUDE.md`, roadmap, this plan) were updated.
  `pnpm typecheck` clean (2026-11-14). Appended EP 17 to `.agent/episodes.md` to
  record the 2026-11-13 guard/poll work and the 4.1.0 sync. **Next:** F5 page wiring.
- 2026-11-13 (audit + doc-drift pass): full audit re-verified the suite (then
  71 files / 393 tests / 0 failures - 74/408 after the security pass below,
  76/417 after the device-approval poll pass, `tsc --noEmit` clean) and reconciled the
  living docs with the facet-sdk 4.0.0 adoption — the facet pins in `AGENTS.md`,
  `CLAUDE.md`, the roadmap and `client-core-architecture-analysis.md` now match
  the then-current pin (sdk 4.0.1 / auth 2.1.2 / components 3.2.2 / store 1.0.6),
  the "three contract adapters" claims are replaced with the real state (later
  closed fully by 4.1.0 `ApiKeySdk`), and the "hooks are the ONLY layer importing
  `@/sdk`" phrasing names the four bootstrap-provider exceptions. Lint could not be
  re-run in that session (eslint stalls loading its config graph on this box);
  the 411-warning figure remains the user's 2026-11-13 measurement.
- 2026-11-13 (security pass): closed three guard-level gaps that no route test
  could see (route tests mock `fastify.auth`) - **P0-8** token-type confusion
  (ID token accepted as a bearer access token), **P0-9** the rate limiter
  keying on unverified claims (every limit bypassable with a forged `sub`;
  also every rejection returned 500 instead of 429), **P0-10** `/oauth/introspect`
  never verifying Basic credentials (plus a 500 on live tokens from an
  array-vs-string `aud`). Each has a dedicated test file; full details in
  `.agent/output.txt`.
