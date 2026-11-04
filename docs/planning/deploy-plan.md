# SovGrant Deployment Plan

## Target
- Platform: Single Hetzner Cloud VPS (8 GB x86 preferred)
- Orchestration: Docker Compose
- Deployment: Match existing GHCR -> SSH deploy flow
- Rationale: Workers are long-running, webhook queue uses Postgres SKIP LOCKED, migrations run at container start. Not suitable for Lambda/serverless.

## Environments
1. Local + Cloudflare Tunnel/Access
2. Private staging on VPS - reachable only via Tailscale/WireGuard
3. Public production behind Cloudflare with only 80/443 open

## Domain Rules
- One real apex domain - fusorb.com
- Staging uses a subdomain - sg.fusorb.com
- Passkey RP ID, did:web, and OIDC issuer are domain-bound
- Staging DB must be wiped before launch
- Synthetic data only in staging

## Hardening Checklist
- [x] No published DB/Redis ports (compose exposes only `api:4000`)
- [x] Redis password required (`REDIS_PASSWORD:?`, `redis-server --requirepass`)
- [x] Non-root container user (`USER fastify`)
- [x] Runtime image without devDependencies (`pnpm prune --prod` in the runner stage)
- [ ] Pinned pnpm version and image digests (pnpm pinning in progress; images not digest-pinned)
- [ ] Read-only filesystem where possible
- [ ] Secrets via sops/age or Docker secrets (still `env_file: .env`)
- [ ] Caddy TLS
- [ ] Host firewall allowing only 80/443 (prod) or nothing public (staging)
- [ ] SSH keys only
- [ ] Unattended security upgrades
- [ ] Nightly encrypted pg_dump to off-site storage with documented tested restore

## KMS Note
Master key currently lives in env. Plan migration to a cloud KMS key-wrap before real identities are stored.

## Compliance Note
NIN/BVN handling and cross-border hosting need review under Nigeria's NDPA before real users. Flag for human/legal review.

## Release Gate
No public launch until real-Postgres integration tests pass and the checklist is fully ticked.
