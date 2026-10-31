# SovGrant CLI - Design & Onboarding Basis (SUPERSEDED)

> **Status: Superseded (2026-10-31).** This design basis has been replaced by
> the executable phased plan at `~/.commandcode/plans/sovgrant-cli-replan.md`
> and the implementation in `packages/cli` (Phase 1). Retained as historical
> basis only.

> Status: **Planned** (per `sovgrant-v2-roadmap.md`: "CLI package extraction"
> rebuild stabilises API contract"). This doc is the initiated basis: the command
> surface, the consumer-wiring detection, the scaffold safety model, and how it
> reuses the facet CLI's shared command core. Code work starts once the API
> contract is stable.

---

## Why a CLI

SovGrant is a Fastify + PostgreSQL (Prisma 7) identity engine. An integrator today
must: stand up a Postgres or we wire-up based on the db they run, agnostically..., run Prisma migrations - it all depends on their stack, and the most recommended is postgres..., copy env config, wire OAuth/OIDC
client settings, seed tenants + RBAC, and connect a frontend to the SDK. A CLI
turns that into one guided flow, detects what the integrator already has (DB
structure, existing auth, frontend stack), and scaffolds only what's missing -
without clobbering their work.

## Package shape

```
@fusorb/sg-cli        (this repo, packages/cli, bin: "sovgrant")
  └── reuses @fusorb/facet-cli's published command core:
      lib/commands.ts     registry resolver, doctor report, update planner
      lib/types.ts        package-manager + monorepo/workspace detection
      lib/writer.ts       safe file writes (patch package.json, never clobber)
      lib/generators-plain.ts  add-component layout + barrel merge
```

The facet CLI already ships `pkg` / `doctor` / `update` and a docs scaffold. The
sg CLI adds the identity-domain commands on top of that core rather than
reimplementing it.

## Command surface (planned)

### `sg init` - wire SovGrant into the consumer repo
- Detects the consumer's **DB structure**: reads `prisma/schema.prisma` /
  `schema.prisma` / a `DATABASE_URL`; classifies as Postgres-ready, needs
  migration, or missing.
- Detects **existing auth/id wiring**: `@fusorb/facet-auth` usage, existing OAuth
  client registrations, session/JWT setup, WebAuthn presence.
- Detects **frontend stack** (reuses facet CLI detection): Next, Remix, Vite,
  plain JS, Python.
- **Scaffolds a sample setup**: env template, Prisma schema patch (optional),
  seed script for tenants + RBAC, an OIDC client config, and a minimal
  `SgClient` frontend wiring - *without overwriting* anything the consumer
  already has.
- **Safe overwrite / safe revert** (consumer's choice at each step):
  - Every file the CLI writes is recorded in a manifest
    (`.sg/generated.json` with content hash + timestamp).
    - `sg revert` restores the pre-scaffold state from that manifest.
  - Overwrites only happen with an explicit `--force` per file, and the prior
    content is preserved in `.sg/backups/`.

### `sg doctor` - audit an SovGrant integration
- Reads the consumer's env, schema, and deps; reports: DB reachable/version,
  migrations applied vs pending, `@fusorb/facet-*` versions vs latest, auth
  surface wired (email/password, passkeys, OIDC), missing secrets, and
  best-practice suggestions (same shape as `facet doctor`).

### `sg migrate` - generate + apply Prisma migrations
- Wraps `prisma migrate dev/deploy` with the SovGrant schema as the source of
  truth, guarded by the same safe-overwrite model.

### `sg setup <sdk|webhook|tenant>` - opinionated sub-scaffolds
- `sg setup sdk` - generates the `SgClient` + env wiring for a frontend.
- `sg setup webhook` - registers a webhook endpoint + HMAC signing sample.
- `sg setup tenant` - seeds a tenant + admin + RBAC role set.

### Inherited from facet core
- `sg pkg` / `sg update` - facet + sg package version check/update.
- `sg add <component>` - copy a facet component into source (shadcn-style).

## Detection details (DB / auth)

| Signal | Source | Meaning |
|--------|--------|---------|
| `prisma/schema.prisma` with `provider = "postgresql"` | file | Postgres-backed; compare model set against SovGrant's required models |
| `DATABASE_URL` (or `POSTGRES_URL`) | `.env` | Connection present; try a `SELECT 1` probe |
| `@fusorb/facet-auth` in deps | package.json | Auth surface partially wired; skip redundant scaffolding |
| OAuth/OIDC env keys (`OIDC_ISSUER`, `JWKS_URL`, client id/secret) | `.env` | IdP integration present |
| `next`/`remix`/`vite`/`python` markers | deps + configs | Frontend stack for the SDK sample |

## Safe overwrite / revert contract

1. Before writing any file, check `.sg/generated.json`; if the path is not
   registered and exists on disk, **skip** unless `--force`.
2. On `--force`, copy the existing file to `.sg/backups/<relative-path>` first.
3. Record every write: `{ path, contentHash, timestamp, forced? }`.
4. `sg revert` walks the manifest newest-first: delete generated files,
   restore backups. **Never** touches files it didn't create.

## Consumer docs (to ship alongside the CLI)

- `docs/sg-cli/quickstart.md` - 5-minute install → `sg init` → run.
- `docs/sg-cli/doctor.md` - what `sg doctor` checks and how to read it.
- `docs/sg-cli/safe-scaffold.md` - the overwrite/revert model.
- `docs/sg-cli/reference.md` - full flag reference + examples.
- Frontmatter link on every page to the hosted SovGrant docs.

## Gating / sequencing

1. **Now**: this design doc is the basis (frontend rebuild still in flight).
2. After API contract stabilises: scaffold `packages/cli` in this repo, reuse
   `@fusorb/facet-cli` core, implement `init` → `doctor` → `migrate` → `setup`.
3. Then: `pkg`/`update`/`add` inheritance + hosted docs.
