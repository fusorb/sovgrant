# SovGrant — Open Work Plan (handoff)

> **What this is:** the sequenced, actionable version of the open items.
> `.agent/output.txt` remains the status truth (what is P0/P1, what is done, the
> evidence); this file is the *how* — acceptance criteria, dependencies, owners —
> so the work can be picked up without re-deriving it.
>
> Last updated 2026-11-11, at the point all P0 items were closed.

## Ground rules (do not re-litigate)

- Read `AGENTS.md` first; `CLAUDE.md` is the fuller handbook and wins on conflict.
- Architecture rules are non-negotiable: business logic in `flows/` never routes;
  errors are `ApiError` statics; flows use `ctx.db`, routes use `fastify.db`;
  `select` projections always.
- Frontend chain: `page → component(s) → hook → store → SDK → API`. `src/hooks/`
  is the only layer that imports `@/sdk`.
- **Never write test counts without re-running the suite.** Current verified:
  71 files / 393 tests / 0 failures; typecheck clean; lint 0 errors.
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

## F5 — wire the 40 stub pages ⬅ NEXT

The only open part of the frontend rebuild. F1–F4 are done: teardown, foundation,
route map and 24 hooks all exist. **This is unblocked now** — P0-4 and P0-7 fixed
the session path, so guarded hooks have a token after a reload.

**How:** replace each `StubPage` with real components from `@fusorb/facet-*`,
calling the existing hook for that domain. Do not call the SDK from a page.

**Suggested order (backend-critical first):** console security (passkeys, MFA,
sessions, paired devices) → identities + external IDs → credentials → OAuth
applications/tokens → organization (members, policy, projects, signing keys, SSO)
→ webhooks → billing → invites/oauth consent.

**Acceptance:**
- No `StubPage` remains on a route that has a backend.
- No page imports `@/sdk` directly (grep to prove it).
- Auth-gated routes behave correctly signed-out *and* after a hard reload.
- `pnpm typecheck` / `pnpm lint` / `pnpm test` green; counts in the docs updated.

**Watch out for:** the pages that need endpoints the SDK still gets wrong — use
the `externalIds` / `devices` / `policies` adapters in `src/sdk/index.ts`, not the
SDK methods (see SDK-1).

---

## P1-1 — move business logic out of fat routes (L)

Routes violating rule #1 begin with: `tenant/routes/{did,signing-key,membership,
policy,invite,tenant}.route.ts`, `identity/routes/{profile,admin}.route.ts`,
`auth/routes/{password,session,mfa,passkey,magic-link,social}.route.ts`,
`oauth/routes/{clients,tokens}.route.ts`, `webhooks/routes/webhook-config.route.ts`,
`idp/routes/idp.route.ts`.

**Reference pattern:** `credentials/*`, `audit/*`, `auth/login`.

**Acceptance:** each listed route is a thin guard → validate → `FlowExecutor.execute()`
→ reply; logic moved into `flows/` with DB access via `ctx.db`; existing tests stay
green; new flow tests where behaviour was previously untested.

---

## SDK-1 — adopt `@fusorb/facet-sdk` 3.0.0 when it publishes (blocked upstream)

The drift is fixed (deviceId) or specified (the rest) upstream; see
`../facet/docs/planning/sdk-canonical-fix-plan.md` G8–G10 and the message prepared
for the facet agent in `.agent/output.txt`.

**Then:**
1. Bump the exact pin in `package.json` (currently `2.1.1`).
2. **Delete the three adapters** in `src/sdk/index.ts` (`externalIds`, `devices`,
   `policies`) and point the hooks back at the SDK methods. Re-check the published
   shapes before deleting — some of them were still wrong as of 3.0.0 planning.
3. Optionally wire `identity.approveDeviceApproval` (nothing calls it today).
4. Tell SovPort to drop its raw-fetch workaround
   (`src/app/.../approve.tsx`, comment naming the SDK gap).

**Acceptance:** adapters gone, hooks still typecheck, suite green, pin bumped.

---

## P1-2 — `ApiKeySdk` upstream (S)

The `api-key` module has no SDK class in facet (their G4). Interim is the `apiKeys`
adapter. No local action; raise upstream.

## P1-3 — delegation (deferred by design, do not resurrect as-is)

`AccessDelegation` was dropped by migration `20261111000000` because nothing
enforced it. If built, it must be **client-anchored token exchange** (RFC 8693)
enforced in the token flows. The four design questions are in
`identity/routes/delegation.route.ts`.

---

## OPS-1 — decide on pushing (owner: user)

**Nothing has been pushed in either repo.** sovgrant is 21 commits ahead of origin;
`../facet` is 8 ahead (two of those from this session, plus another agent's
in-flight work). Pushing `../facet` is worth doing deliberately — it unblocks the
release, and its `ci` job will now pass thanks to the changesets.

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
| F5 | next agent session | — |
| P1-1 | agent (large) | — |
| SDK-1 | agent | facet-sdk 3.0.0 publish |
| P1-2 | facet maintainers | — |
| P1-3 | product decision | design questions unanswered |
| OPS-1 / OPS-2 | user | — |
