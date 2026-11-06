# SovGrant and the NIN Exposure Problem

*Prepared for Uthman Salaudeen, System Architect · November 2026 · Internal*

## Summary

SovGrant and SovPort address part of the NIN exposure problem, at a different layer than the leak itself. Do not email NIMC yet. Fix the weaknesses found in the code review, deploy and independently review the system, and approach verifiers first.

## What the reporting says the problem is

The pattern in the reporting is third-party access, not necessarily a breach of NIMC's core database.

- In 2024, an investigation found that a third party originally authorised to provide NIN verification may have let Xpressverify.com use its credentials.
- NINPrint appeared months after the XpressVerify scandal.
- In September 2026, NIMC denied new breach claims, ordered an investigation, and restricted licensed agents' access.
- NIMC maintains that its core database has not been compromised, while it investigates authorised verification agents.
- NIMC's response includes NINAuth, a platform with web, API and mobile verification designed to avoid exposing the raw NIN. The NIMC Act 2026 also expanded the commission's powers over digital identity infrastructure.

The specific service named in the original report could not be verified in searches. Treat the name as unverified. Do not buy or download anyone's NIN data to test it, which is likely unlawful.

## Where SovGrant and SovPort fit

**What they can do**

- Reduce raw data in circulation. Selective-disclosure credentials let a verifier receive only the claim it needs, such as "identity verified", instead of the whole slip. If that verifier is breached, there is less to sell.
- Give the holder control over presentation. SovPort lets a person decide what is shared each time.

**What they cannot do**

- Secure NIMC's database or its licensees.
- Un-leak numbers that are already exposed.
- Replace the issuer. A credential is only as trustworthy as whoever issued it, so NIMC or an accredited issuer must stand behind it.

Nothing is bulletproof. The credible claim is that exposure is limited and a breach is worth less.

## What the repository review found

Review of `fusorb/sovgrant` as of the commit dated 2026-11-04. Builds and tests were not run.

1. **NIN and BVN values are hashed with plain, unsalted SHA-256** (`src/modules/identity/flows/link-external-id.flow.ts`; `ExternalIdentifier.valueHash` in `prisma/schema.prisma`). An 11-digit number has about 100 billion possible values, so a leaked database could be brute-forced in minutes on commodity hardware. Fix: use a keyed HMAC with a secret held in the KMS. Also make sure the user-supplied `displayValue` can never hold a raw NIN.
2. **SovGrant cannot verify a NIN today.** A code comment states that `verified` is always false and that no automated verification path exists.
3. **No threat model, security document or independent audit** is present in the repository. For a system claiming to resist breach, this is the missing artifact.

## NIMC: now or later

Not now.

- First impressions are hard to redo, and today the system is unaudited and has the hashing weakness above.
- NIMC already has NINAuth and broader powers under the NIMC Act 2026. A pitch now would be a pitch against its own product.
- The realistic path is integration, likely with or through NINAuth, not replacement. This depends on legal and compliance status, which is not known here.

## Recommended order

1. Fix the hashing, write a threat model, and harden.
2. Deploy v1 internally.
3. Get an independent security review before making any claim.
4. Approach verifiers first (universities, fintech onboarding) with one narrow step: replace NIN-slip uploads with a verified presentation.
5. Approach NIMC later with a narrow ask about integrating with NINAuth.

## On publicity and wording

Write about the idea, not the product: why a NIN slip travels so far and what would stop it. Under the ecosystem canon, do not name SovGrant publicly yet. Do not name the alleged service. Cite NIMC's own statements instead of asserting a breach.

| Avoid | Say instead |
| --- | --- |
| "No backdoor", "unhackable" | "Designed to limit exposure" |
| "Solves the NIN breach problem" | "Reduces what verifiers need to receive and store" |
| "NIMC has been breached" | "NIMC says its core database is secure and is investigating third-party access" |

## Sources

- technologytimes.ng: https://technologytimes.ng/nimc-limits-acess-to-nin-database-amid-hacking/
- itedgenews.africa: https://itedgenews.africa/nimc-to-intensify-scrutiny-on-licensees-amid-data-protection-concerns
- Nairametrics, 23 September 2026: https://nairametrics.com/2026/09/23/nimc-denies-nin-data-breach-claims-orders-investigation/
- BusinessDay: https://businessday.ng/?p=1195458
- Leadership: https://leadership.ng/?p=710288
- Freelanews: https://freelanews.com/?p=143922
