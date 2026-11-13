// src/api/plugins/auth-guard.plugin.test.ts
//
// Route tests mock `fastify.auth` wholesale, so the guard's real
// verification path is only exercised here. Regression coverage for the
// token-type check: access and ID tokens share a signing key, and before
// the guard discriminated on `token_use`, an ID token (1h TTL, not covered
// by logout revocation) was accepted as a bearer access token.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { jwtPlugin } from "./jwt.plugin";
import { authGuardPlugin } from "./auth-guard.plugin";
import { signJwt } from "@/lib/jwt";
import { config } from "@/core/config";
import { errorHandler } from "@/core/errors";

const REVOKED_JTI = "jti-revoked-1";

// Deterministic per-jti answer: only REVOKED_JTI is in the table, so test
// order can never consume the mock.
const revokedJtiFindUnique = vi.fn(
  async ({ where }: { where: { jti: string } }) =>
    where.jti === REVOKED_JTI ? { jti: where.jti } : null,
);

const mockDb = {
  revokedJti: { findUnique: revokedJtiFindUnique },
  subscription: { findUnique: vi.fn(async () => null) },
};

const dbStub = fp(
  async (f) => {
    f.decorate("db", mockDb as any);
  },
  { name: "sg:db" },
);

let app: FastifyInstance;

function mint(payload: Record<string, unknown>, secret?: string) {
  return signJwt(payload, {
    privateKeyOrSecret: secret ?? config.security.jwt.secret,
    alg: "HS256",
    expiresIn: "5m",
  });
}

function get(token: string) {
  return app.inject({
    method: "GET",
    url: "/protected",
    headers: { authorization: `Bearer ${token}` },
  });
}

beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(dbStub);
  await app.register(jwtPlugin);
  await app.register(authGuardPlugin);
  await app.register(async (f) => {
    f.get("/protected", { preHandler: f.auth.requireUser }, async (req) => ({
      identity: req.identity,
    }));
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("auth guard - access-token verification", () => {
  it("accepts a token stamped as an access token", async () => {
    const token = await mint({
      sub: "user-1",
      jti: "jti-access-1",
      token_use: "access",
      scope: "openid",
      plan: "FREE",
    });
    const res = await get(token);
    expect(res.statusCode).toBe(200);
    expect(res.json().identity).toMatchObject({ id: "user-1" });
  });

  it("rejects an ID token presented as a bearer token", async () => {
    const token = await mint({
      sub: "user-1",
      jti: "jti-id-1",
      token_use: "id",
      iss: "sovgrant",
      aud: "client-1",
    });
    const res = await get(token);
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe("Invalid token type");
  });

  it("rejects a token with no token_use marker", async () => {
    const token = await mint({ sub: "user-1", jti: "jti-unmarked-1" });
    const res = await get(token);
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe("Invalid token type");
  });

  it("rejects a revoked jti", async () => {
    const token = await mint({
      sub: "user-1",
      jti: REVOKED_JTI,
      token_use: "access",
    });
    const res = await get(token);
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe("Token has been revoked");
  });

  it("rejects a token signed with a different key", async () => {
    const token = await mint(
      { sub: "user-1", jti: "jti-foreign-1", token_use: "access" },
      "z".repeat(32),
    );
    const res = await get(token);
    expect(res.statusCode).toBe(401);
  });
});
