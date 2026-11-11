import type { FastifyInstance } from "fastify";
import { exportJWK, importSPKI } from "jose";
import { z } from "zod";
import { config } from "@/core/config";
import { resolvePemContent } from "@/api/plugins/jwt.plugin";
import { accessTokenJwk } from "@/lib/jwt";

export async function jwksRoute(fastify: FastifyInstance) {
  // The access-token signing key is fixed for the lifetime of the process, so
  // resolve it once here instead of on every request.
  const accessTokenKey = await accessTokenJwk(
    resolvePemContent(config.security.jwt.publicKey),
  );

  fastify.get(
    "/jwks",
    {
      schema: {
        tags: ["OAuth2 / OIDC Server"],
        summary: "RFC 7517 JSON Web Key Set — global signing keys",
        response: {
          200: z.object({ keys: z.array(z.record(z.string(), z.any())) }),
        },
      },
    },
    async (req, reply) => {
      const keys = await fastify.db.tenantSigningKey.findMany({
        where: { status: "ACTIVE" }, // ← was isActive: true
      });

      const tenantJwks = await Promise.all(
        keys.map(
          async (key: {
            publicKey: Buffer | Uint8Array;
            algorithm: string;
            kid: string;
          }) => {
            try {
              const pem = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(key.publicKey).toString("base64")}\n-----END PUBLIC KEY-----`;
              const cryptoKey = await importSPKI(pem, key.algorithm);
              const jwk = await exportJWK(cryptoKey);
              return { ...jwk, kid: key.kid, alg: key.algorithm, use: "sig" };
            } catch {
              return null;
            }
          },
        ),
      );

      // The access-token key is published first. It is the key a relying party
      // needs in order to verify an access token, and the only one available on
      // a deployment that has not provisioned any tenant signing keys yet - the
      // tenant keys are EC keys used to sign DID documents and credentials, not
      // access tokens.
      const published = [
        ...(accessTokenKey ? [accessTokenKey] : []),
        ...tenantJwks.filter(Boolean),
      ];

      return reply.send({ keys: published });
    },
  );
}
