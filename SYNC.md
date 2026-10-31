# Fusorb sync — SovGrant

Source of truth for the ecosystem: the Fusorb architecture repo
(`poetic-dev/fusorb`).

- Naming: `ecosystem/naming-ledger.json`
- Standards: `content/standards/`

Last synced: 2026-10-31, against fusorb `424e31c`.

## Status: in sync

Applied the ledger's renamed entries:

- `ArcWallet` -> `SovPort` in `CLAUDE.md`, `docs/planning/sovgrant-v2-roadmap.md`,
  and `docs/planning/presentation-envelope-design.md`.
- `ArcBase` -> `Relnex`: the `arcbaseWebhookUrl` config key renamed to
  `relnexWebhookUrl` (`src/core/config/config.ts`,
  `src/modules/auth/flows/register.flow.ts`), plus the comment in
  `src/modules/tenant/validators/project.schemas.ts` and the `.env.example` note.
- `@arcevo/` -> `@fusorb/` in the `pnpm-workspace.yaml` comment.

Left as `legacy-ok`: the local DB credential `arcevodev` (`.env.example`,
`docker-compose.yml`) and the historical path-casing comments in `next.config.ts`.

## Staying in sync

Re-read the naming ledger before any rename. Never rename the live
`arcevocirqle` brand, domain, or email addresses.
