# SovGrant Hetzner Deploy Runbook (from scratch)

> **Status:** operational runbook for staging/internal deployment.  
> **Repo state this is based on:** `main` at `5435fb0` (SovGrant) with `ce8020e` (Relnex) aligned for issuer/JWKS + webhook signature contract. Push both before relying on CI/CD deploy.  
> **Goal:** get SovGrant running on a single Hetzner VPS (Docker Compose) with GitHub Actions build/deploy, so internal systems (Relnex/SovPort) can dogfood the real OIDC/JWKS path.

This document answers: *what to provision, which secrets to set, and the exact order of operations*. It complements:
- `docs/planning/deploy-plan.md` (target architecture + hardening checklist)
- `docs/planning/LAUNCH-AUDIT-AND-PLAN.md` (audit findings / release gates)
- `.env.example` (authoritative env var list)

---

## 0) Deploy readiness — honest assessment

### Ready now (code/build)
- **Gates (local, HEAD):** `pnpm typecheck` clean; `pnpm test` **82 files / 427 tests passed** (0 failures). Lint has 0 errors (warnings remain).
- **Core backend:** flows/routes/services for auth, OAuth2/OIDC (authorize/token/introspect/userinfo/JWKS/discovery), WebAuthn/TOTP/magic link, tenants/RBAC/policy, VCs (SD-JWT, did:web/key, status), webhooks, audit, API keys, billing scaffolding — with key security invariants enforced (tenant scoping, `token_use`, revocation pairing, SSRF guards, verified-claim rate limiting, introspect auth, device-approval PoP).
- **Deploy artifacts:** multi-stage `Dockerfile` (node:22-alpine, non-root runner, auto-migrate entrypoint), `docker-compose.yml` (Postgres 17 + Redis 7 + `api` + `workers`), `.dockerignore`.
- **Recent fixes in tree:** issuer consistency (URL/JWKS), `/metrics` gated by `METRICS_TOKEN` (prod fails closed when unset), inbound `POST /webhooks/sg` requires `Authorization: Bearer <WEBHOOK_SIGNING_SECRET>`, `TRUST_PROXY` support, Prisma config compatible with installed Prisma, CI/deploy install sets `DATABASE_URL` for `prisma generate`, deploy-api wired to push-to-main.
- **Relnex alignment (separate repo):** JWKS-preferred verification with URL issuer and compatible webhook signature parsing committed locally — **must be deployed/configured with matching secrets/URLs**.

### Staging/internal-ready after this runbook is completed
If you push, provision the VPS, set secrets correctly, run migrations, and pass the smoke/E2E checks below, SG is **suitable for internal dogfooding and controlled staging**.

### Not yet public-production-ready
Do **not** treat as public-prod until:
- Staging is exercised with real end-to-end flows (incl. cross-repo Relnex/SovPort) for several days with monitoring.
- TLS, firewall, backups + **tested restore**, secret rotation, and ops/runbooks are in place (deploy-plan hardening checklist fully ticked).
- Fresh CI on pushed HEAD is green; `test:rollback` (shadow DB) run where required; auto-deploy-to-main posture reviewed.
- Known integration/ops gaps below are resolved or explicitly accepted.

### Is there anything left to do code-wise? (CLI / minimal UI)
**Short answer: core SovGrant backend is deployable; the CLI is usable but has scaffold drift to address, and UI is minimal/dogfoodable rather than finished.**

- **CLI (`packages/cli`, `@fusorb/sg-cli`, bins `sg`/`sovgrant`)** — **not required to deploy this SovGrant repo to Hetzner** (it scaffolds SG into consumer repos). Current Phase 1 surface is implemented: `init`, `doctor`, `migrate`, `setup sdk|tenant`, `revert` with Postgres/Cockroach adapters, manifest/safe-write, and secret generation. **Code-wise follow-ups (recommended):** keep its env/templates/docs in sync with current SG contract (URL `JWT_ISSUER`/`API_BASE_URL`, `TRUST_PROXY`, `METRICS_TOKEN`, correct `SOVGRANT_WEBHOOK_URL` default `/api/webhooks/sg`, `WEBHOOK_SIGNING_SECRET`, cookie/refresh expectations), expand `doctor` checks for prod-critical vars, and add Phase 2 scope later (additional DBs/adapters, auth-UI scaffolding) only if needed. Treat CLI as “working for local/scaffold flows, verify before relying on it for new consumer onboarding.”
- **UI (this repo’s Next.js app):** routes/views exist (public/auth/console/invites/oauth) on `@fusorb/facet-*`; **dogfoodable/minimal**, but completeness/polish and end-to-end console flows (client/tenant/consent, keys, etc.) need validation — not a finished product UI.
- **Deploy/app code items to verify/fix before or during staging (important):**
  1. **`deploy-web.yml` server install/build env** — it runs `pnpm install --frozen-lockfile` (postinstall/prisma generate needs `DATABASE_URL`) and `pnpm build:web` on the VPS. Ensure `/opt/sg/.env` is present and the remote script sources it and exports `NEXT_PUBLIC_API_URL` for the build (see §4.5 / §6 notes).
  2. **Billing webhooks (`rawBody`)** — billing routes read `(req as any).rawBody` for Stripe/Paystack signature verification. Confirm a raw-body parser/content-type handling is actually in effect for those routes in the running server before enabling billing; fix if missing/broken.
  3. **Redis config alignment to review:** compose runs a Redis service and injects `REDIS_URL`, while app config/env currently models Upstash REST (`UPSTASH_REDIS_REST_*`) for token-cache behavior. Align or confirm intended runtime usage (rate limiting/revocation/blocklist paths) so production behaves as expected.
  4. **Supply-chain/CI hardening:** pin `aquasecurity/trivy-action` (currently `@master`) and consider digest-pinning images (deploy-plan checklist).
  5. **Auto-deploy on push to `main`:** `deploy-api.yml` triggers on push and cascades to web — safe only if `main` is protected and you accept main-as-deploy; otherwise switch to manual/staging-gated.

---

## 1) Architecture (what you are deploying)

- **Single VPS, Docker Compose:** `postgres` (17-alpine), `redis` (7-alpine), `api` (Fastify, port 4000), `workers` (background jobs/webhooks/token cleanup). Optional separate web process (Next.js) per current `deploy-web.yml` (PM2 on host) or containerize later.
- **Persistent volumes:** `pgdata`, `redisdata`.
- **Migrations:** container entrypoint runs `prisma migrate deploy` on start (idempotent); startup fails fast if DB unreachable.
- **Ports:** compose exposes `api:4000` to host; DB/Redis not published. In production put TLS-terminating proxy (e.g. Caddy/Nginx/Cloudflare) in front; keep only 80/443 public.

See `docker-compose.yml`, `Dockerfile`, `docker-entrypoint.sh`, `.github/workflows/deploy-api.yml`, `.github/workflows/deploy-web.yml`.

---

## 2) Prerequisites (local + accounts)

- **Hetzner Cloud** account (project + ability to add SSH key / create server / firewall).
- **GitHub** repo admin access (to add Actions secrets and, if needed, environments).
- **Domain/DNS** control (Cloudflare or your DNS provider). Decide hostnames, e.g. `sg-api.<domain>` and/or `sg.<domain>` for web. **Issuer, WebAuthn RP/origin, and did:web are domain-bound** — pick final staging/prod domains before issuing real credentials.
- **SSH key pair** for deploy/admin access.
- Local tools for ops: `git`, `ssh`, and (optional) `gh` CLI / Hetzner console.

---

## 3) Provision Hetzner (from scratch)

1. **Create project** in Hetzner Cloud (e.g. `sovgrant-staging`).
2. **Add SSH key** (Security → SSH Keys) — public key of the machine/user that will deploy/administer.
3. **Create server**
   - Image: Ubuntu LTS (22.04/24.04) recommended.
   - Type: **CX22** (2 vCPU, 4 GB RAM) recommended minimum for Postgres+Redis+API+workers(+web build headroom); CX11 may be tight.
   - Location: your preferred region.
   - Networking: public IPv4 (and IPv6 if desired). Note the IP → this becomes `SSH_HOST`.
   - Firewall: create/apply (see step 5).
4. **(Recommended) Attach volume** only if you need extra DB/storage separation; otherwise rely on local disk + offsite backups.

---

## 4) Server bootstrap (SSH into VPS)

SSH as root or your admin user: `ssh <user>@<SERVER_IP>`.

### 4.1 Base hardening (minimum)
```bash
# as root (adjust if using a non-root sudo user)
apt-get update && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban git

# SSH: keys only (ensure your key works before disabling passwords)
# edit /etc/ssh/sshd_config: PasswordAuthentication no, PermitRootLogin prohibit-password (or no)
# systemctl reload ssh

# Firewall (production: only 80/443 public; staging can be restricted further via VPN)
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```
Enable unattended security upgrades (`unattended-upgrades`) per your distro defaults.

### 4.2 Install Docker Engine + Compose plugin
Follow Docker’s official install for Ubuntu, then:
```bash
docker --version
docker compose version
# allow deploy user to run docker
usermod -aG docker <deploy-user>
```
Log out/in for group membership.

### 4.3 Install Node/pnpm/PM2 (required for current `deploy-web.yml` path)
`deploy-web.yml` builds and runs Next on the host via `pnpm` + `pm2`:
```bash
# Node 22 (example via NodeSource or nvm) + corepack/pnpm
# Install pnpm (pinned major compatible with repo, e.g. 10.x) and PM2 globally:
npm i -g pnpm pm2
pnpm -v && pm2 -v
```
> If you later containerize web, this host Node/PM2 requirement can be removed.

### 4.4 Create deploy directory and clone
```bash
sudo mkdir -p /opt/sg && sudo chown -R <deploy-user>:<deploy-user> /opt/sg
cd /opt/sg
git clone <YOUR_REPO_GIT_URL> .
git checkout main
```
The API deploy workflow and web deploy workflow both assume `/opt/sg`.

### 4.5 Create `/opt/sg/.env` (server runtime/build env)
Create `.env` from `.env.example` and fill **real** values. This file is used by Docker Compose (`env_file: .env`) **and** must be available for server-side `pnpm install`/`prisma generate` and web builds.

Minimum critical values (see `.env.example` for full list):
- `DATABASE_URL` — for compose you can still rely on the service URL override in `docker-compose.yml`, but **set a valid `DATABASE_URL` in `.env`** so `prisma generate`/postinstall and any host-side tooling work (use the same logical DB creds; inside compose the service env overrides as configured).
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `REDIS_PASSWORD` (compose Redis requires it)
- `JWT_SECRET` (>=32 chars), `COOKIE_SECRET` (>=32 chars), `WEBHOOK_SIGNING_SECRET`
- `API_BASE_URL` (public/staging URL of the API, e.g. `https://sg-api.example.com`)
- `ALLOWED_ORIGINS` (comma-separated, include web origin)
- `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGIN`
- `RESEND_API_KEY`, `EMAIL_FROM`
- `TRUST_PROXY` (e.g. `1` or appropriate value when behind a proxy/load balancer)
- `METRICS_TOKEN` (set in production to protect `/metrics`)
- `KMS_PROVIDER` / key material (`LOCAL_KMS_KEY` for dev/staging only when appropriate; plan cloud KMS before real identities)
- `SOVGRANT_WEBHOOK_URL` (Relnex inbound, e.g. `https://<relnex-host>/api/webhooks/sg`)
- `NEXT_PUBLIC_API_URL` — required for the web build (API base, typically `https://sg-api.example.com/api/v1`)

Generate strong secrets (example):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4.6 DNS and TLS
- Point DNS (A/AAAA) for your API/web hostnames to the server (or to Cloudflare proxy if used).
- Terminate TLS at a reverse proxy (Caddy/Nginx/Cloudflare). Ensure proxy forwards headers correctly and set `TRUST_PROXY` accordingly.
- For WebAuthn/passkeys: `WEBAUTHN_RP_ID` must match the effective domain; `WEBAUTHN_ORIGIN` must match the web origin.

---

## 5) GitHub repository configuration

### 5.1 Actions secrets (required by current workflows)

| Secret | Used by | Purpose / value |
|---|---|---|
| `SSH_HOST` | `deploy-api.yml`, `deploy-web.yml` | VPS public IP or hostname |
| `SSH_USER` | `deploy-api.yml`, `deploy-web.yml` | SSH user with access to `/opt/sg` and docker/pm2 |
| `SSH_KEY` | `deploy-api.yml`, `deploy-web.yml` | **Private** SSH key matching a key authorized on the VPS |
| `NEXT_PUBLIC_API_URL` | `deploy-web.yml` | Public API base for Next build, e.g. `https://sg-api.example.com/api/v1` |
| `GITHUB_TOKEN` | `deploy-api.yml` (built-in) | Used for GHCR login/push/pull in workflow steps — ensure workflow permissions allow `packages: write` (already set) and that the server-side pull can authenticate if required (the workflow passes token via SSH command; verify access) |

> Add these in: GitHub → Repo → Settings → Secrets and variables → Actions. Use Environments (e.g. `production`/`staging`) with protection rules if you want approval gates.

### 5.2 Workflow behavior to be aware of
- **`ci.yml`:** runs on PRs and pushes to `main` (validate/typecheck/lint/scan/test/build checks).
- **`deploy-api.yml`:** runs on **push to `main`** and `workflow_dispatch`; builds & pushes `ghcr.io/<owner>/<repo>-api:<sha>` (+`latest`) and SSHes to `/opt/sg` to `docker compose up -d --no-deps api workers`.
- **`deploy-web.yml`:** runs on `workflow_dispatch` and after successful **Deploy API** (`workflow_run`); SSHes to `/opt/sg`, `git pull`, `pnpm install --frozen-lockfile`, `pnpm build:web`, restarts/starts PM2 `sg-web`.

**Recommendation:** protect `main`, require CI green, and consider restricting auto-deploy to a staging branch/environment until stable.

---

## 6) First deployment (step-by-step)

### 6.1 Pre-flight (before push)
- [ ] `pnpm typecheck` and `pnpm test` pass locally on the commits to deploy.
- [ ] `.env.example` reviewed; server `/opt/sg/.env` populated with real values (no placeholders for required secrets).
- [ ] Relnex config aligned: `SG_ISSUER`/`SG_API_URL`/`SG_JWKS_URL` point to deployed SovGrant, `SG_WEBHOOK_SECRET == WEBHOOK_SIGNING_SECRET`.
- [ ] Domain/DNS/TLS decisions made (RP ID, issuer, origins consistent).

### 6.2 Push and run CI/CD
1. Push SovGrant (and Relnex) to `main` (or trigger workflows manually):
   - `git push origin main` (from each repo, after you’ve verified gates).
2. Watch **CI** complete successfully on the pushed SHA.
3. Watch **Deploy API**: image built/pushed to GHCR, SSH deploy updates `api` and `workers`.
4. Watch **Deploy Web** (triggered after Deploy API success, or run manually): pulls code on server, installs, builds, restarts PM2.

> If `deploy-web` fails at `pnpm install` on server, ensure `DATABASE_URL` is available in `/opt/sg/.env` for prisma generate and that the SSH session can read it. Consider exporting explicitly in the workflow/script: `set -a; source .env; set +a` (or `export DATABASE_URL=...`) before install/build.

### 6.3 First-time server bring-up (if not already running)
On the VPS (once `.env` is in place):
```bash
cd /opt/sg
docker compose pull || true
docker compose up -d postgres redis
# wait for healthy DB/redis, then:
docker compose up -d api workers
docker compose ps
docker compose logs -f --tail=200 api
```
- Entrypoint runs `prisma migrate deploy` automatically. To run manually: `docker compose exec api npx prisma migrate deploy`.
- (Optional, **non-production data only**) seed if you have a seed flow: `docker compose exec api npx prisma db seed` (verify script exists/intent before running).

### 6.4 Web process (current PM2 model)
```bash
cd /opt/sg
pm2 status
pm2 logs sg-web --lines 200
# ensure NEXT_PUBLIC_API_URL was set at build time; rebuild if it changed:
# export/set NEXT_PUBLIC_API_URL then: pnpm build:web && pm2 restart sg-web
```

---

## 7) Verification & smoke tests

### 7.1 Health and basics
- `GET https://<api-host>/health` (or your configured health endpoint) returns OK.
- `GET https://<api-host>/.well-known/openid-configuration` returns discovery with correct `issuer` and endpoints.
- `GET https://<api-host>/.well-known/jwks.json` (or configured JWKS path) returns keys.
- `GET https://<api-host>/metrics`:
  - with `METRICS_TOKEN` set: requires `Authorization: Bearer <token>`;
  - without token in production: should fail closed (per config).
- `docker compose ps` shows `postgres`, `redis`, `api`, `workers` healthy/running.

### 7.2 Auth/OIDC smoke (staging)
- Register/login (password), passkey, MFA as applicable.
- OIDC authorize → consent → token → userinfo with a test client in the correct tenant.
- Token verification via JWKS (issuer matches) — confirms first-party-as-third-party path.
- Refresh flow (cookie-based) and logout/revocation behavior.

### 7.3 Cross-repo / integration
- **Relnex:** login/token verification against SovGrant JWKS with matching issuer; SovGrant→Relnex webhook delivery succeeds (matching `WEBHOOK_SIGNING_SECRET` / signature contract). If any caller posts to SovGrant `POST /webhooks/sg`, it must send `Authorization: Bearer <WEBHOOK_SIGNING_SECRET>`.
- **SovPort:** verify against JWKS/OIDC/VC surfaces when wired.

### 7.4 Operational checks
- Backups: schedule encrypted `pg_dump` offsite and **perform a restore drill**.
- Logs/metrics: confirm log shipping or access, and scraping of `/metrics` with token.
- Rate limits, CORS (`ALLOWED_ORIGINS`), and proxy/IP handling (`TRUST_PROXY`) behave correctly behind TLS proxy.

---

## 8) Rollback / recovery (basic)

- **App rollback:** redeploy a previous image tag/SHA: set `API_IMAGE=ghcr.io/<owner>/<repo>-api:<previous-sha>` and `docker compose up -d --no-deps api workers` (or re-run Deploy API for a known-good commit). Revert web by checking out the previous commit on `/opt/sg`, rebuilding, and restarting PM2.
- **DB:** migrations run forward on start; have backups before risky changes. Use `pnpm test:rollback` (shadow DB) in CI/staging validation for migration safety; practice restore.
- **Secrets:** rotate compromised secrets (DB, JWT/cookie/webhook, API keys) and restart services; reissue tokens/sessions as needed.

---

## 9) Open items / gaps to track

- **Code/contract:** `deploy-web` server `DATABASE_URL`/env sourcing for install; `NEXT_PUBLIC_API_URL` explicit export in SSH step; billing `rawBody` verification path; Redis config alignment (`REDIS_URL` vs Upstash REST vars) with actual runtime usage; pin trivy action and (optionally) image digests.
- **Product/integration:** full console/client/tenant/consent UX validation, first-party-as-third-party tenant/client setup in console, end-to-end webhook delivery semantics, SovPort verifier/wallet wiring.
- **Ops/security:** TLS/firewall hardening, backups + tested restore, monitoring/alerts, secret rotation (incl. any previously exposed creds), staging-before-public gate, NIN/BVN off until compliance review.
- **Process:** protect `main`, require green CI on HEAD, decide manual vs auto deploy promotion.

**Release posture:** internal/staging dogfood → stabilize (E2E + ops) → controlled beta → public, only after the deploy-plan checklist and audit gates are satisfied.