import type { FastifyInstance } from "fastify";
import { IntrospectSchema } from "../validators/oauth.schemas";
import { z } from "zod";
import { isJtiBlocked } from "@/lib/security/jti-blocklist";
import { verifyPassword } from "@/modules/auth/services/password.service";

export async function introspectRoute(fastify: FastifyInstance) {
  fastify.post(
    "/introspect",
    {
      schema: {
        tags: ["OAuth2 / OIDC Server"],
        summary: "RFC 7662 Token Introspection tracking verification",
        body: IntrospectSchema,
        response: {
          200: z.object({
            active: z.boolean(),
            scope: z.string().optional(),
            client_id: z.string().optional(),
            sub: z.string().optional(),
            aud: z.string().optional(),
            iat: z.number().optional(),
            exp: z.number().optional(),
            jti: z.string().optional(),
            token_type: z.string().optional(),
          }),
          401: z.object({ active: z.literal(false) }),
        },
      },
    },
    async (req, reply) => {
      const body = IntrospectSchema.parse(req.body);
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Basic ")) {
        return reply.status(401).send({ active: false });
      }

      // RFC 7662 §2.1: the introspection endpoint MUST authenticate the
      // caller. The previous check only tested for the header's presence, so
      // any caller could introspect any token. Verify the Basic credentials
      // against the Client table - clientSecret is stored as an argon2 hash
      // (see clients.route.ts) - and reject public clients, which have no
      // secret to authenticate with. A failed credential check is a 401, not
      // a silent active:false, so this cannot be used as a token oracle.
      const [callerClientId, callerClientSecret] = decodeBasicAuth(authHeader);

      const caller = callerClientId
        ? await fastify.db.client.findUnique({
            where: { clientId: callerClientId },
            select: { public: true, clientSecret: true },
          })
        : null;

      if (
        !caller ||
        caller.public ||
        !caller.clientSecret ||
        !callerClientSecret
      ) {
        return reply.status(401).send({ active: false });
      }

      if (!(await verifyPassword(caller.clientSecret, callerClientSecret))) {
        return reply.status(401).send({ active: false });
      }

      const accessToken = await fastify.db.accessToken.findFirst({
        where: { token: body.token, revoked: false },
        include: { identity: true, client: true },
      });

      if (accessToken) {
        const active = accessToken.expiresAt > new Date();
        if (!active) return reply.send({ active: false });

        if (accessToken.jti) {
          // Check Redis first (fast O(1)), then DB (authoritative fallback)
          const blockedInRedis = await isJtiBlocked(accessToken.jti);
          if (blockedInRedis) return reply.send({ active: false });

          const revoked = await fastify.db.revokedJti.findUnique({
            where: { jti: accessToken.jti },
          });
          if (revoked) return reply.send({ active: false });
        }

        return reply.send({
          active: true,
          scope: (accessToken.scopes as string[]).join(" "),
          client_id: accessToken.client.clientId,
          sub: accessToken.identityId,
          // TokenService stores the audience as a JSON array; RFC 7662 wants a
          // space-delimited string like the scope claim. (Returning the array
          // here failed the response schema and 500'd every live token.)
          aud: ((accessToken.audience as string[] | null) ?? []).join(" "),
          iat: Math.floor(accessToken.issuedAt.getTime() / 1000),
          exp: Math.floor(accessToken.expiresAt.getTime() / 1000),
          jti: accessToken.jti,
          token_type: "Bearer",
        });
      }

      const refreshToken = await fastify.db.refreshToken.findFirst({
        where: { token: body.token, revoked: false },
      });

      if (refreshToken) {
        const active = refreshToken.expiresAt > new Date();
        return reply.send({ active, token_type: "refresh_token" });
      }

      return reply.send({ active: false });
    },
  );
}

/**
 * Decode an HTTP Basic Authorization header into [clientId, clientSecret].
 * Returns empty strings for anything malformed; the caller rejects those as
 * failed authentication.
 */
function decodeBasicAuth(authHeader: string): [string, string] {
  const decoded = Buffer.from(authHeader.slice("Basic ".length), "base64").toString(
    "utf8",
  );
  const separator = decoded.indexOf(":");
  if (separator === -1) return ["", ""];
  return [decoded.slice(0, separator), decoded.slice(separator + 1)];
}
