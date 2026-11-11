// Tests for the relying-party JWKS contract (P0-6).
//
// A relying party fetches openid-configuration.jwks_uri and verifies an access
// token with what it finds. This encodes that acceptance criteria:
//   - the RSA key that signs access tokens is published, with a kid
//   - a token minted by TokenService's signing path verifies through the
//     published set (createRemoteJWKSet in production == createLocalJWKSet here)
//   - a token signed by a different key does not verify
//
// The key pair is generated per run; the config module is mocked so the route
// resolves it the same way it resolves the real certs.

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import {
  createLocalJWKSet,
  decodeProtectedHeader,
  exportPKCS8,
  exportSPKI,
  generateKeyPair,
  jwtVerify,
} from "jose";

// ── Hoisted mocks (must run before imports) ──────────────────────────────────

const cfg = vi.hoisted(() => ({
  publicKey: "",
  privateKey: "",
  secret: "a".repeat(32),
  accessTtl: "15m",
  refreshTtl: "30d",
}));

vi.mock("@/core/config", () => ({ config: { security: { jwt: cfg } } }));

const tenantSigningKey = vi.hoisted(() => ({ findMany: vi.fn() }));

// ── Imports (after hoisted mocks) ────────────────────────────────────────────

import { jwksRoute } from "./jwks.route";
import { signJwt, accessTokenKid } from "@/lib/jwt";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildApp() {
  const fastify = Fastify();
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.decorate("db", { tenantSigningKey } as never);
  return fastify;
}

/** The route stores tenant keys as raw DER and rebuilds the PEM itself. */
async function ecTenantKeyRow(kid: string) {
  const pair = await generateKeyPair("ES256", { extractable: true });
  const pem = await exportSPKI(pair.publicKey);
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return {
    publicKey: Buffer.from(body, "base64"),
    algorithm: "ES256",
    kid,
  };
}

async function fetchJwks(app: ReturnType<typeof buildApp>) {
  const res = await app.inject({ method: "GET", url: "/jwks" });
  expect(res.statusCode).toBe(200);
  return JSON.parse(res.body);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /jwks — relying-party verification contract", () => {
  let fastify: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    // Generated before registration: the route resolves the key at that point.
    const pair = await generateKeyPair("RS256", { extractable: true });
    cfg.publicKey = await exportSPKI(pair.publicKey);
    cfg.privateKey = await exportPKCS8(pair.privateKey);

    fastify = buildApp();
    await fastify.register(jwksRoute);
    await fastify.ready();
  }, 120_000);

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    tenantSigningKey.findMany.mockReset();
    tenantSigningKey.findMany.mockResolvedValue([]);
  });

  it("publishes the access-token signing key as an RS256 sig key with a kid", async () => {
    const jwks = await fetchJwks(fastify);

    expect(jwks.keys).toHaveLength(1);
    const key = jwks.keys[0];
    expect(key.kty).toBe("RSA");
    expect(key.alg).toBe("RS256");
    expect(key.use).toBe("sig");
    expect(typeof key.kid).toBe("string");
    expect(key.kid.length).toBeGreaterThan(0);
    // a verifier needs the public members, not just an identifier
    expect(typeof key.n).toBe("string");
    expect(key.e).toBe("AQAB");
  });

  it("mints access tokens carrying the kid of that published key", async () => {
    const kid = await accessTokenKid(cfg.publicKey);
    expect(kid).not.toBeNull();

    const token = await signJwt(
      { sub: "identity_1" },
      {
        privateKeyOrSecret: cfg.privateKey,
        alg: "RS256",
        kid: kid as string,
        expiresIn: "5m",
      },
    );

    const jwks = await fetchJwks(fastify);
    expect(decodeProtectedHeader(token).kid).toBe(jwks.keys[0].kid);
  });

  it("verifies an access token through the published key set", async () => {
    const kid = await accessTokenKid(cfg.publicKey);
    const token = await signJwt(
      { sub: "identity_1", scope: "openid" },
      {
        privateKeyOrSecret: cfg.privateKey,
        alg: "RS256",
        kid: kid as string,
        expiresIn: "5m",
      },
    );

    // Same shape a relying party builds from createRemoteJWKSet(jwks_uri).
    const jwks = await fetchJwks(fastify);
    const keySet = createLocalJWKSet(jwks);

    const { payload } = await jwtVerify(token, keySet, {
      algorithms: ["RS256"],
      issuer: "sovgrant",
    });

    expect(payload.sub).toBe("identity_1");
  });

  it("rejects a token signed by a different key", async () => {
    const kid = await accessTokenKid(cfg.publicKey);
    const other = await generateKeyPair("RS256", { extractable: true });
    const otherPem = await exportPKCS8(other.privateKey);

    // Same kid, different key material - the relying party must not accept it.
    const forged = await signJwt(
      { sub: "attacker" },
      {
        privateKeyOrSecret: otherPem,
        alg: "RS256",
        kid: kid as string,
        expiresIn: "5m",
      },
    );

    const jwks = await fetchJwks(fastify);
    await expect(
      jwtVerify(forged, createLocalJWKSet(jwks), { algorithms: ["RS256"] }),
    ).rejects.toThrow(/signature/i);
  });

  it("still publishes active tenant signing keys alongside it", async () => {
    tenantSigningKey.findMany.mockResolvedValue([
      await ecTenantKeyRow("tenant-key-1"),
    ]);

    const jwks = await fetchJwks(fastify);

    expect(jwks.keys).toHaveLength(2);
    const kids = jwks.keys.map((k: { kid: string }) => k.kid);
    expect(kids).toContain("tenant-key-1");
  });

  it("publishes only tenant keys when the deployment signs symmetrically", async () => {
    // A fresh app, registered while no RSA key is configured.
    const savedPublic = cfg.publicKey;
    cfg.publicKey = "";
    const symmetricApp = buildApp();
    await symmetricApp.register(jwksRoute);
    await symmetricApp.ready();

    tenantSigningKey.findMany.mockResolvedValue([
      await ecTenantKeyRow("tenant-key-2"),
    ]);

    const jwks = await fetchJwks(symmetricApp);

    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0].kid).toBe("tenant-key-2");

    await symmetricApp.close();
    cfg.publicKey = savedPublic;
  });
});
