# ── Stage 1: Install ALL dependencies ─────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
ENV PNPM_VERSION=12.18.0
RUN corepack enable && corepack prepare pnpm@$PNPM_VERSION --activate
WORKDIR /app

ENV HUSKY=0

# pnpm-workspace.yaml holds the `overrides` and `allowBuilds`; without it the
# frozen-lockfile check fails ("overrides ... doesn't match the lockfile").
# The root `postinstall` runs `prisma generate`, which needs the schema and
# prisma.config.ts (and prisma.config.ts throws when DATABASE_URL is unset), so
# they are copied here and a dummy URL is given to this one command only.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY . .

# prisma.config.ts throws when DATABASE_URL is unset, even for `generate`. A dummy
# value is enough here: generate never connects to the database.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm prisma:generate
RUN pnpm build:api

# ── Stage 3: Runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
ENV PNPM_VERSION=12.18.0
RUN corepack enable && corepack prepare pnpm@$PNPM_VERSION --activate
WORKDIR /app

ENV HUSKY=0
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 fastify

COPY --from=builder --chown=fastify:nodejs /app/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/prisma ./prisma
# The entrypoint runs `prisma migrate deploy`; Prisma 7 reads the datasource from
# prisma.config.ts, which must therefore be in the image.
COPY --from=builder --chown=fastify:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/package.json ./
COPY --from=builder --chown=fastify:nodejs /app/pnpm-lock.yaml ./

# STOPGAP: dev dependencies are NOT pruned. `prisma` (the CLI that the entrypoint
# uses to migrate) and `dotenv` (imported by prisma.config.ts) are devDependencies;
# pruning removes them and `npx prisma` would then download an unpinned CLI at
# container start. The proper fix is a separate `migrator` image (see the deploy
# plan); until then keep the installed, lockfile-pinned CLI.

COPY --chown=fastify:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER fastify

EXPOSE 4000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/start-server.js"]
