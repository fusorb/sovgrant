// src/lib/jwt/jwks.ts
//
// Key identity for the RSA key that signs access tokens.
//
// A relying party fetches the JWKS advertised by openid-configuration.jwks_uri
// and verifies an access token with it. That only works if (a) the signing key
// is actually published there and (b) the token carries a `kid` naming which
// published key to use. Both sides derive that id from the SAME public key
// here, so the token and the published JWK cannot disagree.
//
// The id is an RFC 7638 JWK thumbprint - a stable function of the key material,
// so it survives restarts and changes automatically when the key is rotated.
//
// Note: everything here works from the PUBLIC key. The private signing key is
// deliberately never imported as extractable just to compute an id.

import { calculateJwkThumbprint, exportJWK, importSPKI, type JWK } from "jose";

/** An RSA JWK carrying everything a relying party needs to verify a token. */
export interface AccessTokenJwk extends JWK {
  kid: string;
  alg: "RS256";
  use: "sig";
}

/**
 * Reduce to the members RFC 7638 hashes for an RSA key. Extra members must not
 * participate, and reducing here keeps the value identical regardless of what
 * else the exporter happened to include.
 */
async function publicRsaJwk(publicKeyPem: string): Promise<JWK | null> {
  try {
    const key = await importSPKI(publicKeyPem, "RS256");
    const jwk = await exportJWK(key);
    return { kty: jwk.kty, n: jwk.n, e: jwk.e };
  } catch {
    return null;
  }
}

/**
 * The JWK to publish for the access-token signing key, or null when this
 * deployment signs symmetrically (no RSA key configured) - in which case there
 * is nothing to publish.
 */
export async function accessTokenJwk(
  publicKeyPem: string,
): Promise<AccessTokenJwk | null> {
  if (!publicKeyPem) return null;

  const jwk = await publicRsaJwk(publicKeyPem);
  if (!jwk) return null;

  const kid = await calculateJwkThumbprint(jwk, "sha256");
  return { ...jwk, kid, alg: "RS256", use: "sig" };
}

// Derived once per key: this runs on every access token we mint, and the key
// cannot change for the lifetime of the process.
let cached: { pem: string; kid: string } | null = null;

/**
 * `kid` to stamp on tokens signed with this key. Always equal to the `kid` on
 * the JWK published by the JWKS endpoint.
 */
export async function accessTokenKid(
  publicKeyPem: string,
): Promise<string | null> {
  if (!publicKeyPem) return null;
  if (cached?.pem === publicKeyPem) return cached.kid;

  const jwk = await accessTokenJwk(publicKeyPem);
  if (!jwk) return null;

  cached = { pem: publicKeyPem, kid: jwk.kid };
  return jwk.kid;
}
