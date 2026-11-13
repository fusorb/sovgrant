// src/api/plugins/rate-limit.plugin.ts
//
// CHANGE: keyGenerator now keys by tenantId+identityId when present,
// falling back to IP. This gives us three tiers:
//
//   1. Authenticated requests → keyed by identityId (+ tenantId if present)
//      Prevents a single user from exhausting the IP-level quota for
//      everyone behind a NAT or shared corporate egress IP.
//      Also prevents one noisy tenant from degrading another tenant's quota.
//
//   2. Unauthenticated requests → keyed by IP (original behaviour)
//      Login, register, magic-link, password-reset all fall here.
//      Per-route tighter limits (e.g. login: 10/min) are still configured
//      directly on those routes via { config: { rateLimit: { max, timeWindow } } }.
//
// TENANT ISOLATION NOTE:
//   Global limit is 200/min per key.
//   Per-tenant quota enforcement (Phase F noisy-neighbour protection) should
//   be layered on top of this in a dedicated tenant-rate-limit middleware
//   once tenant plan tiers are finalised. This plugin handles the mechanism;
//   plan-based limits are a policy concern.

import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { ApiError } from "@/core/errors";

export const rateLimitPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(rateLimit, {
      global: true,
      max: 200,
      timeWindow: "1 minute",

      keyGenerator: async (req) => {
        // Bucket authenticated requests by identity (identityId[:tenantId]),
        // reading the claims from a VERIFIED token only. Claims on an
        // unverified token are attacker-controlled: trusting `sub` outright
        // let a forged Bearer token with a novel sub mint a fresh bucket per
        // request, bypassing this global limit and every per-route one
        // (login, magic-link, password reset, ...). Verification happens
        // once more in the auth guard for protected routes - cheap next to
        // the request it protects, and the only way this hook (which runs
        // BEFORE preHandlers) can know who is calling.
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          try {
            const payload = (await fastify.jwt.verify(
              authHeader.slice(7),
            )) as { sub?: string; tid?: string };
            const sub = payload?.sub;
            const tid = payload?.tid;
            if (sub) {
              return tid ? `${sub}:${tid}` : sub;
            }
          } catch {
            // Invalid or expired token - not an authenticated caller,
            // fall through to IP keying.
          }
        }
        return req.ip;
      },

      // The plugin THROWS whatever this returns, so it must be an Error the
      // app's error handler can classify. The previous plain-object return was
      // unclassifiable: every rejection in production surfaced as a 500 (and an
      // "unhandled runtime failure" log) instead of the intended 429.
      errorResponseBuilder: (_req, context) =>
        ApiError.tooManyRequests(
          `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        ),
    });
  },
  { name: "sg:rate-limit", dependencies: ["sg:jwt"] },
);
