You are the SG-0 engineer for **SovGrant** (Fastify 5, Prisma 7, Postgres 17, Next 16, pnpm workspace, Vitest, Node 22). Work on branch `chore/sg0-pipeline-and-kv`. Never push, never deploy, never add secrets to GitHub. Read `docs/planning/sg0-plan.md`, `CLAUDE.md`, `AGENTS.md`, `docs/planning/hetzner-deploy-runbook.md` first, and follow the repo's own rules. Where they conflict with this prompt, stop and report.

## Fixed names (the identity contract; do not invent others)

| | Staging | Production (not built yet; config only) |
|---|---|---|
| Web origin | `https://sg-stg.fusorb.com` | `https://sg.fusorb.com` |
| API origin and OIDC issuer | `https://sg-stg-api.fusorb.com` | `https://sg-api.fusorb.com` |
| WebAuthn RP ID | `sg-stg.fusorb.com` | `sg.fusorb.com` |
| did:web | **off** until the owner turns it on | off |

These live only in environment files, documentation and workflow inputs, never in `src/`. Live-name trap: never rename `ArcevoCirqle`, `arcevocirqle`, `arcevocirqle.com.ng`, `@fusorb_hq`.

## 0. Baseline (write `docs/planning/sg0-baseline.md`)

Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and the rollback guard (`pnpm test:rollback` with its env flag, against local Postgres). Record pass/fail and counts. The repo claims 81 files / 424 tests: report the real numbers. If anything is red, stop and report; do not fix unrelated failures.

## Rules

- One canonical owner per fact. No hard-coded hosts, ports or secrets in `src/`.
- Every behaviour change has a test. Keep typecheck, lint, tests green after each commit. Small commits, conventional messages.
- No new heavy dependencies. Allowed: `ioredis`.
- Do not touch the identity logic (flows, token semantics) beyond what a task states.
- Security controls must never silently no-op in staging or production.

## Tasks

### T1: Key-value port (the Redis fix)

Problem (verified): Compose starts native Redis and sets `REDIS_URL`, but nothing reads it. `src/lib/security/jti-blocklist.ts`, `src/lib/challenge-store.ts` and `src/lib/security/login-attempt.ts` use the Upstash REST client (`UPSTASH_REDIS_REST_URL/TOKEN`) or fall back to memory. `login-attempt.ts` silently no-ops without Redis, so per-email lockout is off.

1. Create `src/lib/kv/` with a small interface (get, set with TTL, incr with TTL, del, getdel, exists, ping), an `ioredis` implementation, an in-memory implementation (for tests and development only), and a factory chosen from config.
2. Config: `REDIS_URL` (validated, `redis://` or `rediss://`). Upstash variables become optional legacy: if you keep them, keep them behind the same interface; if you remove them, update `.env.example`, docs and validator in the same commit. State your choice and why.
3. Port the three modules to the interface without changing their behaviour or key names (`sg:login_fail:*`, `sg:login_lock:*` etc. stay). Keep the DB `RevokedJti` check authoritative and unchanged.
4. In staging and production (`NODE_ENV` or an explicit `APP_ENV`; follow what the validator already uses): the process **fails to start** if `REDIS_URL` is missing or the store does not answer `ping`. In development and test, the in-memory store is allowed and logs one clear warning.
5. Runtime behaviour if Redis drops after start: security checks that depend on it must **fail closed or degrade to the DB path with an error log and a metric**, never silently pass. For `login-attempt`, decide and document: on store failure, per-IP rate limit stays, an error is logged, and the failure is counted. For JTI, DB lookup remains the authority.
6. Tests: unit tests against the in-memory store for all three modules; integration tests against a real Redis (skipped with a clear message when `REDIS_URL` is absent, enabled in CI via a Redis service container). Prove: lockout thresholds (5 / 10 / 20), lockout clears on success, challenge consumed once (`GETDEL` semantics), JTI blocked then rejected, startup failure when Redis is unreachable in staging mode.
7. Existing `jti-blocklist.redis.test.ts` and `jti-blocklist.init-fail.test.ts` must be migrated, not deleted.

### T2: Readiness that tells the truth

`src/api/routes/health.route.ts`: `/health/live` unchanged. `/health/ready` must check (a) database `SELECT 1`, (b) the key-value `ping`, (c) that the database has applied every migration in `prisma/migrations` (compare against `_prisma_migrations`; cache the result for 30 s). Return 503 with per-check detail (no secrets, no hostnames). Test each failure. Add the same checks to the container `HEALTHCHECK` if the Dockerfile has one; otherwise add it.

### T3: Environment validator that refuses a mixed identity

In `src/core/config/env.validator.ts` and `config.ts`, when running as staging or production, fail startup with a clear message when any of these hold:
- issuer, API base URL, any allowed origin, redirect base, or WebAuthn origin contains `localhost`, `127.0.0.1` or a non-https scheme;
- RP ID is not a registrable suffix of the web origin host;
- issuer is not equal to the API origin (unless `JWT_ISSUER` is set explicitly to an https URL, in which case log it at startup);
- a secret equals a documented default or is shorter than the repo's minimum;
- `ALLOWED_ORIGINS` contains `*`;
- `TRUST_PROXY` is unset.
Add `APP_ENV` (`development|test|staging|production`) if it does not already exist. Tests for each rule. Update `.env.example` with a **staging block** using the names above and a production block with placeholders only. Write `docs/environment.md` (single table: variable, meaning, required in which environment, example, who owns it) and make sure Relnex's documented variables (`SG_ISSUER`, `SG_JWKS_URL`, `SG_API_URL`) are listed in an "integrations" section with the staging values.

Also verify and report (do not guess): with the web at `sg-stg.fusorb.com` and the API at `sg-stg-api.fusorb.com`, does the refresh-token cookie reach the API? Inspect cookie attributes (`domain`, `sameSite`, `secure`, `httpOnly`, path) and the SDK's `credentials: "include"`. If it needs a `COOKIE_DOMAIN` or equivalent, add it as validated configuration with a test.

### T4: Images and migrator

1. `Dockerfile`: replace the stopgap. Targets: `api` (runtime, no dev dependencies), `migrator` (Prisma CLI plus migrations only), `web` (Next standalone output; check `next.config.ts` for `output: "standalone"` and add it if safe, otherwise report why not). Non-root user. Pin base image by digest or exact tag. No migrations in the entrypoint: remove `prisma migrate deploy` from `docker-entrypoint.sh` (keep the script only if something else needs it).
2. `docker-compose.yml`: services `postgres` (named volume, healthcheck, no published port), `redis` (password, named volume, no published port), `migrator` (one-shot, `restart: "no"`, API depends on its successful completion), `api`, `workers`, `web`, and `caddy`. Only Caddy publishes ports (80, 443). Provide `docker-compose.staging.yml` overrides rather than copying the file.
3. `deploy/Caddyfile`: the staging hosts from the table, HSTS, compression, request body limit, `reverse_proxy` to `web:3000` and `api:4000`, access log to stdout in JSON, `/metrics` blocked from the public (metrics is reached on the internal network or with `METRICS_TOKEN` only).
4. Verify locally: from a clean volume, `docker compose up` brings everything healthy; `curl` readiness is 200; stopping Redis makes readiness 503; stopping Postgres makes readiness 503; a deliberately broken migration makes the migrator fail and the API **not** start. Paste the transcript of these checks into `docs/planning/sg0-baseline.md` under "Local acceptance". If Docker is unavailable, stop and say so.

### T5: Pipeline

Replace `.github/workflows/deploy-api.yml` and `deploy-web.yml` with one `deploy.yml`:
1. `on: workflow_dispatch` only, inputs: `environment` (`staging` or `production`), `sha` (default: the dispatched ref's SHA). No push trigger.
2. Job `gate`: verify that the CI workflow concluded `success` for that exact SHA (use `gh run list --workflow ci.yml --commit <sha> --json conclusion`); fail otherwise.
3. Job `build`: build `api`, `migrator`, `web` images once, tagged with the SHA; run Trivy (pinned action by commit SHA) and fail on HIGH/CRITICAL with a documented ignore file; push to GHCR.
4. Job `deploy`: `environment: ${{ inputs.environment }}` (GitHub Environments carry the SSH secrets and a required reviewer on production). On the server: pull the three images by SHA, run the migrator, start `api workers web` with that SHA, poll `/health/ready` for up to 90 s, then run a smoke script (T6). On failure, restore the previous SHA (stored in a state file on the server) and fail the job.
5. Pin every third-party action to a commit SHA. Set minimal `permissions`. Keep concurrency per environment, with `cancel-in-progress: false`.
6. `deploy/` scripts on the server side: `deploy.sh` (idempotent, takes SHA), `rollback.sh`, `backup.sh` (encrypted `pg_dump` to a configured off-box target; use `age`; no credentials in the repo), `restore-drill.sh` (restores into a scratch database and runs row-count checks). Shell with `set -euo pipefail`; shellcheck-clean.
7. Remove PM2 and server-side `git pull` from the runbook and replace the runbook with the new procedure.

### T6: Smoke script

`scripts/smoke.mjs <baseUrl>`: checks `/health/live`, `/health/ready`, discovery document (`issuer` equals the API origin), JWKS (at least one key, every key has a `kid`), `/metrics` is 401 without a token, TLS and HSTS header present, and a CORS preflight from the staging web origin succeeds while one from `https://evil.example` fails. Exit non-zero on any failure. Unit-test the parsing logic; the network checks run in CI against the local Compose stack.

### T7: CI

Extend `ci.yml`: Postgres 17 and Redis 7 service containers; run `pnpm test` with the integration tests enabled; run the rollback guard; run a Compose build smoke (`docker compose config` plus build of all targets, no push). Keep it fast; cache pnpm.

### T8: Docs

Update `docs/planning/open-work-plan.md`, `sovgrant-v2-roadmap.md` (the Redis/rate-limit rows, link to `sg0-plan.md`), and `CLAUDE.md` (status table, test counts re-measured, the new pipeline). Create `docs/planning/sg0-ledger.md` with three empty lists: Verified, Observed defect, Unverified. Add a "known limits" paragraph: single VPS, single API replica, in-process rate-limit store.

## Quality bar

- [ ] No `localhost`, host name or secret in `src/` outside tests (grep proof in the report).
- [ ] Staging start fails with a clear message for every validator rule (tests).
- [ ] No security control silently no-ops in staging/production.
- [ ] `docker compose up` from a clean volume is healthy; each failure drill behaves as stated.
- [ ] Typecheck, lint, all tests, rollback guard green; real counts reported.
- [ ] Workflow files pass `actionlint`; scripts pass `shellcheck`.

## Stop conditions

Stop and report if: the baseline is red; Docker is unavailable; a change would alter token semantics or the database schema (propose it instead); a task needs a credential, a server, or the owner's decision.

## Final report (chat)

Branch and head commit; baseline versus after (real numbers); what each task changed in one line; defects found that you did not fix; the design choices you made (Upstash kept or removed, `APP_ENV`, cookie domain); what the owner must do on GitHub (Environments, secrets list, reviewer) and on the server. No recap of steps.
