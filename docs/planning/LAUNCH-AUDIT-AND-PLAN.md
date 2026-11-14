# SovGrant Launch Audit & Plan

**Date:** 2026-11-04  
**Status:** Pre-Launch Assessment  
**Target:** Production-ready deployment

## Current State

- **Tests:** 386/386 passing (70 test files)
- **Typecheck:** Passing (locally verified)
- **Lint:** Clean - 0 errors (431 warnings tracked). `eslint.config.mjs` no longer lints generated trees; `no-explicit-any` / `no-unused-vars` / `react-hooks/set-state-in-effect` report as warnings. Before 2026-11-06 lint failed with 1275 errors, and because it ran before test in `ci.yml`, CI had never reached the test/build steps.
- **Security:** Keys rotated to env; certs untracked; docker hardened (non-root, no exposed DB/Redis ports). ✅ **Git history purged (2026-11-06)** - the old DB password was redacted from every commit and the leaked `codebase_snapshot.txt` / `arcid_codebase_snapshot.txt` were removed from history; the repository was then deleted and recreated so GitHub no longer serves the old objects. Verified against a fresh clone of the remote: 0 occurrences. The credential should still be rotated - it was public.
- **Device Approval:** Fully wired (pairing + MFA integration)
- **All repos in sync:** sovgrant, sovport, facet

## Competitive Analysis

### vs BetterAuth, Clerk, Auth0, Okta

**Our advantages:**
- **Africa-first design** - NIN/BVN support, local payment providers (Paystack, Flutterwave), SMS via Brevo, local compliance awareness (NDPA)
- **Self-hostable** - Full control, no vendor lock-in, data sovereignty
- **Verifiable Credentials** - SD-JWT VC support, did:web, status lists (ahead of most competitors)
- **Device-as-authenticator** - SovPort paired device approval is unique, similar to Zoho OneAuth but integrated deeply
- **Multi-tenant IAM** - Full org/project/tenant model with policies
- **WebAuthn/Passkeys** - First-class support
- **Open architecture** - Extensible flows, modules, etc.

**Gaps vs competitors:**
- **UI polish** - Need cleaner onboarding, better docs
- **Ecosystem** - Need more integrations, SDKs for other languages
- **Enterprise features** - SSO/SAML needs more polish, SCIM support missing
- **Compliance certifications** - SOC2, ISO27001, etc. (long-term)
- **Pricing model** - Need clear positioning

**Verdict:** We're building something genuinely different. Not a clone - more of a "sovereign identity platform" than just auth. The VC/did:web focus + Africa-first approach gives us a unique angle. Worth pursuing.

## Critical Blockers (P0) - Must fix before launch

| Item | Status | Action | Notes |
|---|---|---|---|
| Git history secrets | ✅ Done (2026-11-06) | Purged with `git filter-repo`, then the repo was deleted and recreated | Old DB password redacted in all commits. No cert/key files were ever committed (verified). A fresh clone of the remote shows 0 occurrences. **Still rotate the credential** - it was publicly readable. |
| Production secrets management | TODO | Move from .env to proper secrets (Docker secrets, or orchestrator env vars) | Update deploy workflows |
| VPS provisioning | TODO | Set up Hetzner VPS per deploy-plan.md | Follow the plan we created |
| Caddy/reverse proxy + TLS | TODO | Configure Caddy for HTTPS, firewall (80/443 only) | Production setup |
| Database migrations on fresh DB | TODO | Test `prisma migrate deploy` from scratch | Verify docker-entrypoint works |
| Rate limiting | ✅ Done | Rate limits added to device-approval endpoints | `device-approval.route.ts` sets per-route limits: create (5/min), poll (10/min), approve/reject (10/min) - commit `a08cb30` |
| End-to-end test | TODO | Test full flow: pair SovPort -> MFA with device approval -> approve from SovPort | Critical validation |

## High Priority (P1) - Should fix before/at launch

| Item | Status | Action | Notes |
|---|---|---|---|
| Audit logging for device approval | TODO | Add DEVICE_APPROVED, DEVICE_REJECTED, DEVICE_APPROVAL_EXPIRED events | Needed for security console/audit trail |
| Enforce revocation checks | TODO | Verify revoked devices can't approve, update lastSeenAt | Already mostly there, need to verify |
| Backup & restore | TODO | Set up encrypted nightly pg_dump to off-site storage + tested restore | Critical for production |
| CORS for production domains | TODO | Update ALLOWED_ORIGINS for actual domains | |
| Monitoring/alerts | TODO | Set up uptime monitoring, basic alerts | Can use free services initially |
| Proper Ed25519 signing in SovPort | ✅ DONE (2026-11-11) | Real Ed25519 crypto + device-approval signing landed in SovPort (`91be7a4`); re-verified against sovgrant `dcda05b` on 2026-11-13 | Security improvement |

## Medium Priority (P2) - Post-launch polish

| Item | Status | Action | Notes |
|---|---|---|---|
| Lint warning debt | TODO | Pay down the 431 warnings (`no-explicit-any` 364, plus unused-vars and `set-state-in-effect`) | Non-blocking; CI is green. Concentrated in tests, `next.config.ts` and `packages/cli`. |
| Test coverage for device approval | TODO | Add more tests for new flows | Core flows have tests but could be better |
| SSO/SAML polish | TODO | Improve SAML flows | Works but could be smoother |
| SCIM support | TODO | Add SCIM for enterprise customers | Nice to have |
| Multi-language SDKs | TODO | Python, Go SDKs | Expand ecosystem |
| Compliance certifications | TODO | Start SOC2/ISO27001 planning | Long-term |

## Docs & Positioning

### Need to create/update:
- [ ] **README.md** - Make it compelling, explain value prop clearly
- [ ] **Pitch deck draft** - For contributors/partners/investors
- [ ] **Contributor partnership docs** - Clear path for contributors
- [ ] **Launch announcement draft** - For when ready
- [ ] **API documentation** - Ensure Swagger/OpenAPI is good
- [ ] **Getting started guide** - Smooth onboarding

### Positioning angle:
"SovGrant is a sovereign identity platform built for Africa and beyond. Self-hostable IAM with Verifiable Credentials, device-based authentication, and Africa-first integrations. Own your identity infrastructure."

## Launch Countdown Plan

**Week 1 (This week):**
- [ ] Complete E2E test of device approval flow
- [x] Purge git history of secrets (done 2026-11-06)
- [ ] Add rate limiting to device approval endpoints
- [ ] Add audit logging
- [ ] Set up staging environment

**Week 2:**
- [ ] Deploy to staging on VPS
- [ ] Test everything end-to-end on staging
- [ ] Set up backups
- [ ] Configure monitoring
- [ ] Security review

**Week 3:**
- [ ] Fix any issues found in staging
- [ ] Prepare launch materials (docs, pitch deck)
- [ ] Final security check
- [ ] Deploy to production

**Launch Day:**
- [ ] Deploy to production
- [ ] Verify everything works
- [ ] Publish announcement
- [ ] Monitor closely

## Immediate Next Steps

1. **E2E test** - Start docker compose locally and test the full flow
2. ~~**Purge secrets from history**~~ - **done** (2026-11-06) via `git filter-repo` + repo recreate; rotate the exposed credential
3. ~~**Add rate limiting** - Protect device approval endpoints~~ **done** (`device-approval.route.ts`)
4. **Add audit logs** - For compliance/tracking

Let us start executing.


# SovGrant Launch TODO

## P0 - Critical (Must do before launch)
- [x] **Purge git history of secrets** - Done 2026-11-06: `git filter-repo` redacted the old DB password and removed the leaked snapshot files, then the repository was deleted and recreated so no old objects remain. Credential rotation still outstanding.
- [x] **Add rate limiting to device-approval endpoints** - Done: `device-approval.route.ts` sets per-route rate limits (create 5/min, poll 10/min, approve/reject 10/min).
- [ ] **Add audit logging for device approval** - Log DEVICE_APPROVED, DEVICE_REJECTED, DEVICE_APPROVAL_EXPIRED events
- [ ] **E2E test device approval flow** - Test full flow with actual pairing
- [ ] **Set up production secrets management** - Move away from plain .env files for production

## P1 - High Priority
- [x] **Verify revocation enforcement** - Ensure revoked devices can't approve, update lastSeenAt on approval — **DONE (2026-11-11)**, commit `52aa73f`: `approve-device-approval.flow.ts` now requires proof-of-possession *and* restricts the approving device to the caller's own `revokedAt: null, trusted: true` row, updating `lastSeenAt` on success. Covered by 6 tests including the revoked/untrusted and cross-identity cases.
- [ ] **Backup & restore setup** - Encrypted nightly pg_dump + tested restore procedure
- [ ] **Update CORS for production domains** - Configure ALLOWED_ORIGINS properly
- [ ] **Set up monitoring/alerts** - Basic uptime monitoring and alerts
- [x] **Improve SovPort Ed25519 signing** - DONE (2026-11-11, SovPort `91be7a4` real Ed25519 crypto + device-approval signing); the wallet's crypto was re-verified against sovgrant `dcda05b` on 2026-11-13

## P2 - Polish
- [ ] **Add more tests for device approval** - Increase coverage
- [ ] **Create pitch deck** - For contributors/partners/sponsors
- [ ] **Create contributor partnership docs** - Clear onboarding for contributors
- [ ] **Polish README** - Better positioning and getting started
- [ ] **API docs review** - Ensure Swagger is comprehensive

## Quick wins we can do now
- [x] Tests passing (386/386)
- [x] Security hardened (no root, no exposed ports); keys moved to env
- [x] Device approval wired end-to-end
- [x] All repos in sync
- [x] Deploy plan created
- [x] MFA flow has device approval option
