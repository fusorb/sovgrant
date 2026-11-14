# SovGrant: Episodic Canon
## (what broke, how we fixed it, what survived) – local tracker

> Purpose: a living narrative of how this repo reached a working, sovereign-identity
> state. Written in `.agent/` (tracked here, unlike `facet/` where it is local-only) so
> the tracker reflects process without polluting the published tree. Canonical facts
> live in README/CLAUDE.md/docs; this file lives in the head between sessions.
>
> Mantra: evolution is the only option.
> Rule chain: manual → semi-automated → automated. If a fix is still manual after a
> release, it is not done.

================================================================================

EP 01 -- The Namespace Churn (arcid → sovgrant, @arcevo → @fusorb)
--------------------------------------------------------------------------------
What broke:
  The repo began life as `arcid` / "ArcID" consuming `@arcevo/facet-*` packages, in an
  ecosystem whose ledger was mid-rename (ArcWallet → SovPort, ArcBase → Relnex).
  Names lived in six independent layers at once: `package.json`, env var names, CI and
  Docker deploy identifiers, `src/**` branding, Prisma identifiers (plus migration enum
  idempotency), docs/planning, and the logo assets. A rename in one layer left drift in
  the others.

How we fixed it:
  Applied the rename as a batch, not piecemeal:
  - `e53c74d` rename package to sovgrant + swap `@arcevo/*` → `@fusorb/*` facet packages
  - `ee114ff` env vars and build/CI/deploy identifiers
  - `8a0de25` branding across `src/`
  - `079e654` prisma identifiers + migration enum idempotency
  - `87da68f` docs and planning (arcid → sovgrant)
  - `f490615` replace arcid logos with sovgrant (sg) logos
  - `d3d5cae` Arc* → Sov*/Fusorb naming + facet SDK rename

What survived:
  Every architectural decision. The `Flow` abstraction, the module shape, the review
  chain (`page → hook → store → SDK`), and the identity bridge all survived untouched.
  The churn was purely a namespace problem.

State: complete. `d5f513a` records the Fusorb sync note; `SYNC.md` tracks the ledger
  revision the renames were applied against.

Lesson: a rename is a namespace problem, not an architecture problem — but it is only
  finished when it lands in all six layers. Leftovers (`arcid-*.png`, stale `@arcevo/*`
  references) survive behind renamed code and resurface later as orphans (see EP 11).

================================================================================

EP 02 -- v0.1.0 Closed, v0.2.0 Opened
--------------------------------------------------------------------------------
What happened:
  `3e501b7` "chore: v0.1.0 done" closed the backend: auth engine, OAuth2/OIDC provider,
  WebAuthn/passkeys, TOTP MFA, SD-JWT Verifiable Credentials, did:web/did:key,
  multi-tenant RBAC, webhooks, billing, audit. `31c7bb4` then re-opened the tracker as
  v0.2.0 with the API-key work marked done, and the v2 roadmap became the live document.

What survived:
  The version boundary is honest: `0.1.0` is the backend; `0.2.0` is integration +
  hardening. `CLAUDE.md` and `docs/planning/sovgrant-v2-roadmap.md` carry the split.

State: complete.

Lesson: closing a version is a docs act as much as a code act. A "done" that only lives
  in someone's head is a manual fix, and manual fixes rot (rule chain).

================================================================================

EP 03 -- API Keys, Hashed at Rest
--------------------------------------------------------------------------------
What happened:
  `5b27aa3` added the API-key management backend: a Prisma model, CRUD flows/routes,
  bearer-token auth-guard detection, a `requirePermission` scope fallback, and migration
  + rollback coverage.

What survived:
  Keys are stored as a SHA-256 hash (`@unique` for lookup) plus a short display prefix —
  never the plaintext, which is returned exactly once at creation. The guard primitive
  is the same one every other route uses.

State: complete (16 unit tests + Tier-1 migration check).

Lesson: a machine credential is a public key, not a password. Hash it, index the hash,
  and never hand it back twice.

================================================================================

EP 04 -- The Facet Migration (SDK wiring, cookies, and a stale dist)
--------------------------------------------------------------------------------
What broke:
  Three separate failures, in sequence:
  (a) Integration tests were blocked until the facet packages actually shipped
      (`79908d5` closes the P0 once they did).
  (b) The refactor to `@fusorb/facet-sdk` (class-based `AuthSdk`/`TenantSdk`/…) moved the
      refresh token into an httpOnly cookie (`7a53357`), changing the session contract.
  (c) A stale `facet-sdk` `.d.ts` in the pnpm store served old types to the build
      (`b171e59` "bust stale pnpm store cache serving old facet-sdk d.ts"), and
      `IssueCredentialParams` had to be re-derived from the SDK method signature
      (`32afbe9`, `5a4b9aa`).

How we fixed it:
  Migrated the SDK layer to thin singleton wiring, then purged the in-repo UI in a final
  phase (`5d9fa12`). `src/sdk/index.ts` now owns one `SgClient` + 401 auto-refresh and
  re-exports the facet domain SDKs; the old factory-pattern `src/sdk/*.sdk.ts` are gone.

What survived:
  The chain rule (`page → component → hook → store → SDK`) and the single wiring point.

State: complete. `src/sdk/` is `index.ts` (+ its test) only.

Lesson: this is facet's EP 22 in a different repo — the `dist`/`.d.ts` is the product a
  consumer consumes. A stale store cache is a lie served to the build; bust it, don't
  work around it.

================================================================================

EP 05 -- Security Hardening: The Revocation Gap, SSRF, and the Auto-Link Gate
--------------------------------------------------------------------------------
What broke:
  `bf16acb` closed three classes of hole at once:
  - **Access-token revocation gap** — revoking a session left bound access tokens alive.
  - **SSRF** — outbound fetches to user-supplied URLs were not all guarded.
  - **Federated login auto-link** — linking a social identity to an existing account
    could proceed without proving the email was verified.

How we fixed it:
  - Revocation always pairs `blockJti` (Redis blocklist) **and** `revokedJti.create` (DB),
    with the TTL computed from the token's real `expiresAt`; `AccessToken.sessionId`
    binds a session to its tokens so `DELETE /sessions/:id` kills the whole chain.
  - Every outbound fetch to a user-supplied URL passes `assertSafeUrl()` first — webhook
    test-ping, IdP OIDC discovery + token endpoint, SAML entryPoint.
  - Auto-link is gated on `emailVerified === true` in both `social.route.ts` and
    `idp.service.ts`.

What survived:
  These are now permanent invariants in `AGENTS.md` §8.

State: complete (Phase 3 closed).

Lesson: revocation is a kill chain, not a single write; SSRF guard is a call-site
  property (grep for every fetch), not a library you install once.

================================================================================

EP 06 -- The Secret We Rotated and the Copy We Missed
--------------------------------------------------------------------------------
What broke:
  `3b36ec5` untracked `certs/` and added it to `.gitignore`; `1ec976d` "security: rotate
  keys and passwords to env" moved credentials out of compose into env. But two copies of
  the old DB password survived:
  - **`.env.example` — tracked** — still carried a live DSN with the old DB password
    percent-encoded (`%40` = `@`), sitting directly under a comment that says
    `# Example: postgresql://user:password@host...`. (The value is deliberately not
    reproduced here.)
  - **`replacements.txt` — untracked but NOT ignored** — the `git filter-repo
    --replace-text` map keyed on the same password, one `git add .` from being committed.

How we fixed it (2026-11-04):
  Sanitized `.env.example` to the placeholder from its own comment; deleted
  `replacements.txt`; added `replacements*.txt` to `.gitignore` as a guard.

What survived:
  The ceremony: secrets live in env, never in tracked files.

State: complete (2026-11-06). The history purge landed — `git filter-repo`
  redacted the password across every commit and dropped two leaked
  `codebase_snapshot.txt` files; the repo was then deleted and recreated so the
  host no longer serves the old objects. See EP 13.

Lesson: rotating a secret in one file is not rotating it. Audit *every* tracked file
  that can carry it — env examples, compose defaults, docs — and never leave the purge
  map lying around. This is facet's EP 07 ("the tracker is a claim, not a fact") applied
  to secrets: "rotated" was a claim nobody had verified file-by-file.

================================================================================

EP 07 -- The Docker That Would Not Have Started
--------------------------------------------------------------------------------
What broke:
  The trackers said "Docker deployment ✅ Done — `docker compose up -d` to run." Two
  lines said otherwise:
  - `docker-compose.yml`, `workers` service:
    `DATABASE_URL: postgresql://\:\@postgres:5432/\?schema=public` (and a matching broken
    `REDIS_URL`) — corrupted interpolation. The `api` service was fine, so the API would
    have started and the **workers would not** — webhook delivery silently dead.
  - `Dockerfile`: `corepack prepare pnpm@\ --activate` (broken shell token) and
    `ENV PNPM_VERSION=9.15.4` while the repo's `packageManager` is `pnpm@12.6.0`.

How we fixed it (2026-11-04):
  Mirrored the `api` service's env into `workers`; set `corepack prepare
  pnpm@$PNPM_VERSION --activate`; corrected `PNPM_VERSION` to `12.6.0`.

What survived:
  The multi-stage image, non-root `fastify` user, auto-migrate entrypoint.

State: fixed in the working tree; not yet exercised end-to-end (`docker compose up`).

Lesson: a deploy artifact is "done" only when it actually starts. "docker hardened,
  non-root, no exposed ports" was true and also irrelevant — the service that mattered
  had an unstartable env block nobody executed.

================================================================================

EP 08 -- The Device That Became an Authenticator (SovPort approval)
--------------------------------------------------------------------------------
What happened:
  `1ef2293` added the `PairedDevice` model + register/list/revoke flows/routes;
  `881c86c` + `bf80c44` built the console surface on `sgClient`; `9e25706` added the
  device-approval flows/routes; `d716855` wired "Approve with SovPort" into the MFA flow;
  `a08cb30` added per-route rate limiting **and** fixed the MFA device-approval call.

What survived:
  Device-as-authenticator: pair SovPort → MFA challenge → approve on the paired device.
  Approval flows through the same `FlowExecutor` + audit path as everything else.

State: complete, with rate limiting retrofitted.

Lesson: rate limiting was added to a brand-new auth surface in a *follow-up* commit, not
  the one that introduced it. Any auth-sensitive route ships with its `config: { rateLimit }`
  from day one (invariant in CLAUDE.md §6).

================================================================================

EP 09 -- The CLI That Does Not Reuse the CLI
--------------------------------------------------------------------------------
What happened:
  `006bbe3` scaffolded `packages/cli` (`@fusorb/sg-cli`, bins `sg` + `sovgrant`):
  init/doctor/migrate/setup/revert, Postgres + Cockroach adapters, safe overwrite/revert
  with a manifest + backups, secret generation, `--dry-run/--force/--yes`. `e97815a`
  wired the workspace + `.sg/` ignore; `7529690` made CI use `packageManager` from
  `package.json`.

What survived:
  The safety model — nothing is overwritten without a backup, `sg revert` only touches
  files it created.

State: Phase 1 complete (10 tests). Phase 2 (Mongo/Mongoose/Dynamo + auth-UI
  scaffolding) pending. **Unpublished** despite `publishConfig.access: public`.

Lesson: the design doc planned to "reuse `@fusorb/facet-cli`'s published command core."
  It does not — `facet-cli` is installed **globally on the machine as a universal tool**,
  not as a per-repo dependency, and `sg-cli` is standalone (commander + @clack/prompts).
  The doc is retained as historical intent with a NOT-FOLLOWED banner. Absence from
  `package.json`/`node_modules` is by design, not staleness.

================================================================================

EP 10 -- The ADR That Made SovGrant the IdP
--------------------------------------------------------------------------------
What happened:
  `b090fbf` recorded the identity-model ADR: SovGrant is the single canonical IdP, every
  Fusorb product and every third-party client is a **relying party** that references
  identity by `identityId` and never owns credentials. `9afd177` extended it to
  third-party relying parties: public OIDC surface only (discovery, `authorize`+PKCE,
  `token`, `userinfo`, `introspect`, `revoke`, JWKS).

What survived:
  The contract: first-party parties get shared UI/SDK convenience (`@fusorb/facet-auth`,
  `@fusorb/facet-sdk`); third parties get OIDC + **JWKS only — never a shared secret**.

State: accepted (2026-10-31).

Lesson: an IdP's value is its contract, not its feature list. Naming the two classes of
  relying party and their differing trust levels *before* building integrations prevented
  a shared-secret sprawl.

================================================================================

EP 11 -- The Trackers That Outran Reality (the 2026-11-04 truth pass)
--------------------------------------------------------------------------------
What broke:
  Every tracker had drifted from the source, and both `.agent/episodes*` files were junk:
  - `CLAUDE.md` stated **three different** test counts (62/358, 61/342, 71/387; now 70/386
    after the duplicate root sanity test was removed).
  - All facet version pins were two majors stale (sdk 1.1.0 vs actual 2.1.1, etc.), and
    the roadmap claimed the CLI was scaffolded "on `@fusorb/facet-cli@0.8.0`".
  - RBAC "19 permissions" vs actual **22**; `AuditLogAction` "51" vs **53**; "50+ models"
    vs **48**; per-module coverage rows all off by one or more.
  - `README.md` said **bcrypt**; the code uses **argon2id**.
  - The repo-layout tree still listed deleted `src/store/` and described
    `src/components/` as "auth forms + layout (in-repo)".
  - `LAUNCH-AUDIT` listed device-approval rate limiting as TODO though `a08cb30` had
    shipped it.
  - `.agent/episodes.md` (24,787 B) and `.agent/episodes-plain.md` (16,710 B) were
    pure whitespace/NUL — **zero letters**, git-flagged binary, nothing recoverable.

How we fixed it:
  Verified ground truth against source first (`grep` counts, `prisma/schema.prisma`,
  `package.json`), fixed `CLAUDE.md` as the canonical handbook, then mirrored into
  `AGENTS.md`, `README.md`, the roadmap, `client-core-architecture-analysis.md`,
  `sovgrant-cli-design.md`, `oauth-secrets-setup.md`, `deploy-plan.md`, and
  `LAUNCH-AUDIT-AND-PLAN.md`. Recomputed the coverage table per-module. Replaced the
  corrupt episode tracker with this file, deleted the plain duplicate, and locked
  `.agent/*.md` as text in `.gitattributes`.

What survived:
  The architecture — nothing documented as a *design* decision was wrong; only the
  *status* claims were. The code was ahead of the docs, not behind.

State: reconciled 2026-11-04; counts verified against source.

Lesson: the tracker is a claim, not a fact (facet EP 07). Prose counts drift because
  nothing derives them — the cure is fewer prose counts, verified against source, in one
  place. And a tracker that git calls *binary* stops showing you diffs at all: keep it
  UTF-8 text or you will not notice it rotting.

================================================================================

EP 12 -- Dropping ArcVerify (the verifier surface is an API, not an app)
--------------------------------------------------------------------------------
What broke:
  The roadmap carried "ArcVerify — verifier-facing counterpart (presentation
  verification endpoint)" as a 1.0.0 **P0**. But the verification *engine* already
  shipped in SovGrant 0.1.0: `POST /verify/session` + `POST /verify/present`,
  `verifyDetachedJws()` in `src/lib/security/jws-proof.ts`, backed by
  `verifyCredentialFlow` and the `VerifySession` model. ArcVerify was only ever the
  verifier-facing *app*, and SovPort is the *holder/presenter* side — a third role.

How we fixed it:
  Removed ArcVerify as a product. The verifier surface is the public `/verify/*` contract
  with **SovPort as the first consumer**; third parties call the same API. Updated
  `presentation-envelope-design.md` (title + all references → "Verifier"), the roadmap
  row, and the `project.schemas.ts` comment. `docs/identity-model.md` already carries the
  third-party contract.

What survived:
  Zero code changed — the engine was already built and correct.

State: doc decision recorded 2026-11-04.

Lesson: separate the engine from its consumers before planning a deliverable. A
  "counterpart app" that only drives a finished API is a UI task, not a milestone — and
  naming it as one created a phantom P0 for months.

================================================================================

EP 13 -- The Force-Push That Did Not Un-Publish
--------------------------------------------------------------------------------
What broke:
  The planned purge ran and every local signal said it had worked. `git
  filter-repo` redacted the DB password from every commit and removed the two
  leaked `codebase_snapshot.txt` files; the rewritten `main` was force-pushed
  with `--force-with-lease`; the branch was clean and the local history was
  verified free of the secret.

  The exposure was untouched. A force-push removes commits from a **branch**;
  it does not remove them from the **host**. GitHub went on serving the
  pre-purge commits by SHA (`GET /commits/<sha>` returned 200), and one of those
  commits - `LAUNCH-AUDIT-AND-PLAN.md` - quoted the live password in its own
  prose. The audit document was the widest copy of the secret we had.

  Two further surprises fell out of the same check: the old remote history had
  diverged from local with *identical subjects and identical dates* but
  different SHAs (a rewrite fingerprint - 112 "behind" commits that were really
  duplicates), and no cert/key file had ever been committed at all, so the
  "RSA keys in history" item in the audit was a claim nobody had checked.

How we fixed it (2026-11-06):
  Deleted `fusorb/sovgrant` and recreated it, then pushed the purged history
  into a repository with no prior objects. Verified the only way that counts -
  cloned the fresh public remote and searched its entire history for both the
  encoded and decoded forms of the secret: 0 occurrences, 0 snapshot commits.
  The old SHA now returns 422 "No commit found".

What survived:
  All content. 139 commits, rewritten with identical trees - the working-tree
  hash before and after the rewrite was byte-identical. Only history changed.

Lesson: "purged" means the *host* no longer serves it, not that your local refs
  moved. Verify against a fresh clone of the remote, never against your own
  working copy. And never write a credential into a tracker to describe a leak -
  you have just created one more copy, in the file most likely to be shared.

================================================================================

EP 14 -- The Gate That Never Ran
--------------------------------------------------------------------------------
What broke:
  Recreating the repository surfaced a red CI that nothing local had noticed.
  The `Lint` step failed with 2237 problems - and because `ci.yml` runs lint
  *before* test, rollback and build, the pipeline had never once reached those
  steps on the remote. "CI pipeline ✅" in the trackers described the workflow
  file existing, not the workflow passing.

  55% of the pile was a config bug rather than code: ESLint's flat config does
  not read .gitignore, and `eslint.config.mjs` only ignored `.next`/`out`/`build`
  - so the generated Prisma client (`prisma/generated/**`, already gitignored)
  was being linted, contributing 1244 problems on its own.

How we fixed it:
  - `globalIgnores` now lists the generated/build trees: `prisma/generated/**`,
    `dist/**`, `packages/*/dist/**`, `coverage/**`, `.agent/**`.
  - `react/no-unescaped-entities` narrowed to the characters that actually break
    JSX (`>` and `}`); a bare apostrophe in prose is escaped correctly by React
    and was forcing 25 pointless copy edits across the mail templates.
  - Two real `prefer-const` violations fixed.
  - `no-explicit-any` (364 instances, spread over ~100 core files) and
    `react-hooks/set-state-in-effect` (4 instances, in auth-critical pages) are
    now warnings - visible and countable, not blocking.

  Result: 2237 problems -> 431, and 1275 errors -> 0, so lint exits clean.

What survived:
  Every rule that catches a real defect stays at `error`, and the steps that had
  never executed now actually run on push: tests, the secret scan, Trivy, the
  migration rollback guard and both builds.

Lesson: a gate that has never been observed passing is not a gate. The local
  habit was "green typecheck + tests" - lint was never in it, so it rotted
  invisibly behind a step that failed first. And before fixing 1275 violations,
  check whether you are linting code a machine wrote: 55% of this pile was
  generated output that should never have been read.

================================================================================

EP 15 -- The Drift Under the Green
--------------------------------------------------------------------------------
What broke:
  `pnpm test` was green, typecheck was green, and the backend could not run
  against its own database. Diffing the live schema against `schema.prisma`
  returned far more than the change being made: three gaps, accumulated over
  months, none of them visible to any test - because every DB-touching test
  mocks the client.

  1. `PairedDevice` and `DeviceApproval` were declared in `schema.prisma` and
     created by NO migration at all. Seven flows read them - device pairing and
     device approvals, the whole SovPort ceremony - and each would have failed
     on its first real query.
  2. `20260822000000_remove_dead_audit_enum_values` set out to delete two dead
     `AuditLogAction` values. Postgres cannot DROP VALUE, so the migration
     recreated the type - from a hand-copied list that also omitted
     `PASSKEY_USED`, `CREDENTIAL_ISSUED` and `CREDENTIAL_REVOKED`. Those three
     were live: credential issuance, credential revocation and passkey login
     each write one. Issuing a credential would have died on an invalid enum
     value.
  3. `ApiKey` and `ExternalIdentifier` columns had drifted from the schema
     (column types, a stale default, a missing index and both foreign keys).

How we fixed it:
  - Generated `20261111000010_repair_schema_drift` with
    `prisma migrate diff --from-migrations prisma/migrations --to-schema
    prisma/schema.prisma --script` - the chain produces its own repair, so it
    cannot be another hand-copied list.
  - Kept the model drop (`20261111000000`) and the repair as separate
    migrations, so either can be reverted on its own.
  - Took a `pg_dump` first, created the `sg_shadow` database the config already
    expected, applied both with `pnpm prisma:deploy`, then read the result back
    out of the database instead of trusting an exit code.
  - Fixed the guard that should have caught all of it, which could not fail:
    its connectivity probe used a 3s timeout this machine reliably exceeded, so
    both Tier-2 checks hit an early return and an opted-in run went green having
    verified nothing; its assertion expected an empty diff, but Prisma 7 renders
    zero drift as a placeholder comment; and it shelled out through `npx`, which
    hangs here.

What survived:
  The repair is proven, not assumed - the diff from migrations now returns only
  Prisma's empty-migration placeholder, and with the guard repaired both live
  checks genuinely run (15.1s, 8.6s) and pass. The database matches the schema
  for the first time in months, and credential issuance, revocation, passkey
  login and device pairing have working storage underneath them.

Lesson: a suite that mocks the database cannot tell you the database is wrong.
  "Green" was true and meant far less than it looked. The only check covering
  this class of bug was opt-in - and broken in three independent ways, which is
  why nobody noticed. Two rules: never hand-copy an enum's value list (diff it),
  and never trust a gate you have not watched fail. Note the shape of the trap -
  the guard's early return made a broken check indistinguishable from a passing
  one, so every run was a green light that meant "I did not look".

================================================================================

EP 16 -- The Key Nobody Published, and the Cookie Nobody Sent
--------------------------------------------------------------------------------
What broke:
  Two contracts the system advertised and did not honour. Both were invisible
  from inside, because each half looked individually reasonable.

  A relying party - Relnex, wiring its first integration - fetched the
  `jwks_uri` from our own discovery document and could not verify an access
  token. That endpoint publishes only the ACTIVE `TenantSigningKey` rows, the
  tenant VC/DID EC keys; the RSA key that signs access tokens was never in it.
  `signJwt` also set no `kid`, so even with the key present a verifier had
  nothing to select it by. The consuming repo had a pinned public key as a
  fallback - the kind of workaround that hides exactly this.

  The same shape sat in the browser session. The refresh token is an httpOnly
  cookie, which is the whole point of the design - but the SDK never sets a
  `credentials` option and the app calls the API cross-origin, so the browser
  discarded the `Set-Cookie` at login and never sent it back. Refresh had
  therefore never worked; the access token just expired after 15 minutes. On top
  of that, `SgProvider` only attempts the refresh-cookie exchange when its
  storage already holds a token, and the client only retries a 401 when it
  already holds one - so after a reload no token could be obtained by any path,
  while the persisted user was still restored and the UI still redirected into a
  console that could load nothing.

How we fixed it:
  - Key identity moved into `src/lib/jwt/jwks.ts`: the `kid` is the RFC 7638
    thumbprint of the RSA public key, so the token and the published JWK cannot
    disagree and rotation is automatic. Derived from the PUBLIC key, because the
    alternative - importing the signing key as extractable - would have changed
    the signing key's posture just to compute an identifier.
  - `signJwt` takes an optional `kid`; `/oauth/jwks` publishes the RSA key.
  - `fetchInit: { credentials: "include" }` on the client: one line, available
    in the published SDK, fixing a path that had never worked.
  - `AuthBootstrap` mounts above `SgProvider` and does the cookie exchange
    first, so the provider comes up holding a token. Tokens still never touch
    localStorage.
  - Both were prototyped against the real `certs/` key pair before any repo
    change, and each acceptance criterion is now an assertion in the suite.

What survived:
  Relnex can set `SG_JWKS_URL` and drop its pinned key. The token and session
  paths are real for the first time - issuance, verification, refresh, reload -
  and both fixes stay correct if facet later defaults them, since they only make
  explicit what the design always assumed.

Lesson: a contract nobody can observe failing is a contract you do not have.
  Both were "implemented" in the sense that the code existed and the endpoint
  answered 200; what was missing was anyone being able to use them. Watch for the
  workaround - a pinned public key and a "just log in again" habit were both
  symptoms in plain sight. Probe your own advertised contracts from the outside,
  the way a stranger would.

================================================================================

EP 17 -- Three Guards That Trusted the Wrong Thing, a Poll That Said Too Much,
         and the Adapter That Outlived Its Gap
--------------------------------------------------------------------------------
What broke:
  Two different kinds of drift surfaced in the 2026-11-13 audit.

  (a) **Guard-level security (P0-8 / P0-9 / P0-10).** Route tests mock
      `fastify.auth`, so they could never see the auth guard, the rate limiter,
      or the introspection route's caller checks. Three holes hid there:
      - Token-type confusion (P0-8): access and ID tokens share a signing key and
        `sub`+`jti`, so the guard accepted an ID token as a bearer credential. ID
        tokens have 1h TTL and were not covered by logout/revocation (which blocks
        access-token JTIs), so the "weaker" token outlived the real one.
      - Rate limiting keyed on unverified claims (P0-9): the key generator
        base64-decoded the Bearer token and bucketed by raw `sub`, so a forged
        `Bearer x.<random-sub>.y` minted a fresh bucket per request - defeating
        every per-route limit (login, magic-link, password reset). A second defect
        made every rejection throw a plain object the error handler could not
        classify, so 429s surfaced as 500s.
      - Introspection trusted the caller (P0-10): `/oauth/introspect` (RFC 7662
        §2.1) checked only that Basic auth existed, never that it was valid, so
        any caller could read any token's metadata; and the live-token branch
        returned `aud` as an array against a string schema, 500-ing real tokens.

  (b) **Device-approval poll leaked context (SovPort handoff).**
      `GET /identity/device-approvals/:challenge` was the only unauthenticated
      route in that file. The challenge is a bearer secret (32 random bytes) and
      must not double as a browsing-context oracle; the poll had to authenticate
      the caller and reveal requester ip/userAgent/email only to the owning
      identity, and only while pending.

  (c) **SDK drift vs. published reality (P1-2 closure).** `@fusorb/facet-sdk`
      4.1.0 shipped `ApiKeySdk` upstream (facet `5af9c0a`), but sovgrant still
      carried the interim generic-client `apiKeys` adapter, and the workspace had
      a half-applied local state (lock/workspace on 4.1.0, `package.json` still
      pinned 4.0.1) that looked like a bump without being one.

How we fixed it:
  - P0-8: `TokenService.issue` stamps `token_use: "access" | "id"`; the guard
    requires `"access"` and rejects unmarked/ID tokens. Dedicated
    `auth-guard.plugin.test.ts` (5 tests) - not a route-mock test.
  - P0-9: key generator verifies the Bearer token via `fastify.jwt.verify`
    before trusting `sub`/`tid`, falling back to IP keying; rejections now throw
    `ApiError.tooManyRequests` (real 429). `rate-limit.plugin.test.ts` (3).
  - P0-10: Basic credentials verified against the Client row's argon2 secret
    (public clients and bad creds → 401, never `active:false`); `aud` is
    space-joined per RFC 7662. `introspect.route.test.ts` (7).
  - Poll: `requireUser` on the route; flow returns requester context only to a
    session of the same identity while pending, with a `select` projection.
    `poll-device-approval.flow.test.ts` (7) + `device-approval.route.test.ts` (2).
    Counts re-measured: 76 files / 417 tests / 0 failures, typecheck clean.
  - 4.1.0 sync (2026-11-14): confirmed published/installed 4.1.0 exports
    `ApiKeySdk` with the backend's shapes; aligned `package.json`/lock/workspace,
    replaced the interim adapter in `src/sdk/index.ts` and `src/hooks/use-api-keys.ts`
    with `ApiKeySdk`, updated living docs, and verified `pnpm typecheck` clean.

What survived:
  The invariants are now explicit and tested at the layer that enforces them:
  token kind is part of the credential, rate limits key on verified identity, the
  introspection oracle authenticates its reader, and a bearer challenge does not
  reveal who is signing in. The SDK is a single wiring point again - no
  app-maintained API-key shim where an upstream class exists.

State: complete. P0-8/9/10 and the poll hardening shipped 2026-11-13; P1-2 closed
  in-repo on 2026-11-14 against published `@fusorb/facet-sdk@4.1.0`. Cross-repo:
  SovPort must send Bearer on the poll and run pair→MFA→approve e2e; Relnex
  (`041e9a8`) already enforces `token_use: "access"` at its JWKS anchor.

Lesson: a route suite that mocks the guard proves the route, not the gate. Any
  security property enforced by a plugin, a key generator, or an unauthenticated
  edge needs its own test that exercises that layer directly. And a dependency
  "bump" is not real until pin, lock, workspace, installed artifact, and the
  code that consumes it all agree - a half-applied bump is drift wearing a
  version number.

================================================================================

## The Rule Chain (why these episodes exist)
--------------------------------------------------------------------------------
  MANUAL        -- a fix lives in someone's head or an unshared script.
                   (e.g. "rotate the password" done in one file; manual `docker compose`
                   nobody actually ran; counts typed into CLAUDE.md by hand.)
  SEMI-AUTOMATED -- codified and run on demand, still needs a human trigger.
                   (e.g. `pnpm scan:secrets`; `pnpm test:rollback` opt-in.)
  AUTOMATED     -- wired into CI; fails the build or ships without a human.
                   (e.g. CI runs scan:secrets + Trivy + typecheck + test + rollback on
                   every push; the drift gates that keep this canon's claims honest.)

The line that matters: if a fix is still MANUAL after it has been released, the release
is a lie. Most episodes above promoted one fix at least one rung. EP 06's history purge
was promoted to done in EP 13; EP 09's Phase 2 is still **open**, not **done**.

Lesson: evolution, not perfection. Ship the manual fix so you can measure it, then
  automate the thing that hurt. The next bug becomes EP 18.
