// src/modules/oauth/routes/introspect.route.test.ts
//
// RFC 7662 §2.1 requires the introspection endpoint to authenticate the
// caller. These tests pin that contract: only a confidential client whose
// secret verifies gets a response body; anything else is a 401 - never a
// silent active:false that would double as a token oracle.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { introspectRoute } from "./introspect.route";
import { hashPassword } from "@/modules/auth/services/password.service";

const CLIENT_ID = "introspect-client";
const CLIENT_SECRET = "s3cret-introspect-pw";
const PUBLIC_CLIENT_ID = "public-spa-client";

const db = {
  client: { findUnique: vi.fn() },
  accessToken: { findFirst: vi.fn() },
  refreshToken: { findFirst: vi.fn() },
  revokedJti: { findUnique: vi.fn(async () => null) },
};

let app: FastifyInstance;

function basic(id: string, secret: string) {
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

function post(token: string, auth?: string) {
  return app.inject({
    method: "POST",
    url: "/oauth/introspect",
    headers: auth ? { authorization: auth } : {},
    payload: { token },
  });
}

beforeAll(async () => {
  const secretHash = await hashPassword(CLIENT_SECRET);
  db.client.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.clientId === CLIENT_ID) {
      return { public: false, clientSecret: secretHash };
    }
    if (where.clientId === PUBLIC_CLIENT_ID) {
      return { public: true, clientSecret: null };
    }
    return null;
  });

  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate("db", db as any);
  await app.register(introspectRoute, { prefix: "/oauth" });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("POST /oauth/introspect - caller authentication", () => {
  it("rejects a request without Basic credentials", async () => {
    const res = await post("any-token");
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ active: false });
  });

  it("rejects a wrong client secret", async () => {
    const res = await post("any-token", basic(CLIENT_ID, "wrong-secret"));
    expect(res.statusCode).toBe(401);
  });

  it("rejects an unknown client", async () => {
    const res = await post("any-token", basic("nobody", "whatever"));
    expect(res.statusCode).toBe(401);
  });

  it("rejects a public client, which has no secret", async () => {
    const res = await post("any-token", basic(PUBLIC_CLIENT_ID, ""));
    expect(res.statusCode).toBe(401);
  });

  it("rejects a malformed Basic payload", async () => {
    const malformed = `Basic ${Buffer.from("no-colon-here").toString("base64")}`;
    const res = await post("any-token", malformed);
    expect(res.statusCode).toBe(401);
  });

  it("returns active:false for an unknown token once authenticated", async () => {
    db.accessToken.findFirst.mockResolvedValueOnce(null);
    db.refreshToken.findFirst.mockResolvedValueOnce(null);
    const res = await post("unknown-token", basic(CLIENT_ID, CLIENT_SECRET));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ active: false });
  });

  it("reports a live access token", async () => {
    db.accessToken.findFirst.mockResolvedValueOnce({
      token: "at-1",
      revoked: false,
      expiresAt: new Date(Date.now() + 60_000),
      jti: "at-jti-introspect-1",
      scopes: ["openid"],
      client: { clientId: CLIENT_ID },
      identityId: "user-1",
      audience: ["api"],
      issuedAt: new Date(),
    });
    const res = await post("at-1", basic(CLIENT_ID, CLIENT_SECRET));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      active: true,
      sub: "user-1",
      client_id: CLIENT_ID,
      scope: "openid",
    });
  });
});
