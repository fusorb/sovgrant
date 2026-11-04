# ── Stage 1: Install ALL dependencies ─────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
ENV PNPM_VERSION=12.6.0
RUN corepack enable && corepack prepare pnpm@$PNPM_VERSION --activate
WORKDIR /app

ENV HUSKY=0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY . .

RUN pnpm prisma:generate
RUN pnpm build:api

# ── Stage 3: Runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
ENV PNPM_VERSION=12.6.0
RUN corepack enable && corepack prepare pnpm@$PNPM_VERSION --activate
WORKDIR /app

ENV HUSKY=0
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 fastify

COPY --from=builder --chown=fastify:nodejs /app/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/prisma ./prisma
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/package.json ./
COPY --from=builder --chown=fastify:nodejs /app/pnpm-lock.yaml ./

RUN pnpm prune --prod --ignore-scripts

COPY --chown=fastify:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER fastify

EXPOSE 4000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/start-server.js"]
