# Fusorb sync — SovGrant

Source of truth for the ecosystem: the Fusorb architecture repo
(`poetic-dev/fusorb`).

- Naming: `ecosystem/naming-ledger.json`
- Standards: `content/standards/`

Last checked: 2026-10-31, against fusorb `424e31c`.

## Outstanding: apply the ledger's renamed entries

1. **`ArcWallet` -> `SovPort`**
   - `CLAUDE.md`
   - `docs/planning/sovgrant-v2-roadmap.md`
   - `docs/planning/presentation-envelope-design.md`
2. **`ArcBase` / `arcbase` -> `Relnex`**
   - the `arcbaseWebhookUrl` config key in `src/core/config/config.ts` and
     `src/modules/auth/flows/register.flow.ts`
   - the comment in `src/modules/tenant/validators/project.schemas.ts`
3. **`@arcevo/` -> `@fusorb/`**
   - the comment in `pnpm-workspace.yaml`

Leave as `legacy-ok`: the local DB credential `arcevodev` (`.env.example`,
`docker-compose.yml`) and the Windows path-casing comments in `next.config.ts`.

## Next step

Apply items 1-3 in one change, then run this repo's typecheck and tests. Do not
rename the live `arcevocirqle` brand, domain, or email addresses.
