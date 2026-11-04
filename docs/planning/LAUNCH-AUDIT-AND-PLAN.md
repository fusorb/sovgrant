# SovGrant Launch Audit & Plan

**Date:** 2026-11-04  
**Status:** Pre-Launch Assessment  
**Target:** Production-ready deployment

## Current State

- **Tests:** 387/387 passing (71 test files)
- **Typecheck:** Passing (locally verified)
- **Security:** Keys rotated, certs removed from git, docker hardened (non-root, no exposed DB/Redis ports)
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
| Git history secrets | TODO | Purge old DB password & RSA keys from history with git filter-repo/BFG | Old password `***REMOVED***` and old certs still in history - compromised if public |
| Production secrets management | TODO | Move from .env to proper secrets (Docker secrets, or orchestrator env vars) | Update deploy workflows |
| VPS provisioning | TODO | Set up Hetzner VPS per deploy-plan.md | Follow the plan we created |
| Caddy/reverse proxy + TLS | TODO | Configure Caddy for HTTPS, firewall (80/443 only) | Production setup |
| Database migrations on fresh DB | TODO | Test `prisma migrate deploy` from scratch | Verify docker-entrypoint works |
| Rate limiting | TODO | Add rate limits to device-approval endpoints | Prevent abuse/spam |
| End-to-end test | TODO | Test full flow: pair SovPort -> MFA with device approval -> approve from SovPort | Critical validation |

## High Priority (P1) - Should fix before/at launch

| Item | Status | Action | Notes |
|---|---|---|---|
| Audit logging for device approval | TODO | Add DEVICE_APPROVED, DEVICE_REJECTED, DEVICE_APPROVAL_EXPIRED events | Needed for security console/audit trail |
| Enforce revocation checks | TODO | Verify revoked devices can't approve, update lastSeenAt | Already mostly there, need to verify |
| Backup & restore | TODO | Set up encrypted nightly pg_dump to off-site storage + tested restore | Critical for production |
| CORS for production domains | TODO | Update ALLOWED_ORIGINS for actual domains | |
| Monitoring/alerts | TODO | Set up uptime monitoring, basic alerts | Can use free services initially |
| Proper Ed25519 signing in SovPort | TODO | Upgrade from simplified signing to proper Ed25519 | Security improvement |

## Medium Priority (P2) - Post-launch polish

| Item | Status | Action | Notes |
|---|---|---|---|
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
- [ ] Purge git history of secrets
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
2. **Purge secrets from history** - Use git filter-repo
3. **Add rate limiting** - Protect device approval endpoints
4. **Add audit logs** - For compliance/tracking

Let us start executing.
