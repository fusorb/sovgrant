// src/api/plugins/rate-limit.plugin.test.ts
//
// Regression coverage for the keyGenerator: it must never mint a bucket
// from an UNVERIFIED token's claims. Before the fix, a forged Bearer token
// carrying a novel `sub` produced a fresh bucket per request - bypassing
// the global limit and every per-route one (login, magic-link, password
// reset). Verified identities must still bucket separately.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { jwtPlugin } from "./jwt.plugin";
import { rateLimitPlugin } from "./rate-limit.plugin";
import { signJwt } from "@/lib/jwt";
import { config } from "@/core/config";

const dbStub = fp(
  async (f) => {
    f.decorate("db", {} as any);
  },
  { name: "sg:db" },
);

let app: FastifyInstance;

function mint(sub: string) {
  return signJwt(
    { sub, jti: `jti-${sub}` },
    {
      privateKeyOrSecret: config.security.jwt.secret,
      alg: "HS256",
      expiresIn: "5m",
    },
  );
}

function call(token?: string) {
  return app.inject({
    method: "GET",
    url: "/limited",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

// Status + body together, so a failing assertion shows WHY a request was
// rejected (a bare status code hides the error message).
function snapshot(res: { statusCode: number; body: string }) {
  return { status: res.statusCode, body: res.body.slice(0, 200) };
}

beforeAll(async () => {
  app = Fastify();
  await app.register(dbStub);
  await app.register(jwtPlugin);
  await app.register(rateLimitPlugin);
  await app.register(async (f) => {
    f.get(
      "/limited",
      { config: { rateLimit: { max: 2, timeWindow: "1 minute" } } },
      async () => ({ ok: true }),
    );
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("rate-limit keying", () => {
  it("buckets a forged token by IP, so rotating its `sub` cannot reset the limit", async () => {
    const results: Array<{ status: number; body: string }> = [];
    for (let i = 0; i < 3; i += 1) {
      const forged = `x.${Buffer.from(
        JSON.stringify({ sub: `forged-${i}` }),
      ).toString("base64url")}.y`;
      results.push(snapshot(await call(forged)));
    }
    // String form: a failure prints the full status + body instead of a
    // truncated object diff.
    const lines = results.map((r) => `${r.status} ${r.body}`);
    expect(lines[0]).toMatch(/^200 /);
    expect(lines[1]).toMatch(/^200 /);
    expect(lines[2]).toMatch(/^429 /);
  });

  it("still gives different verified identities separate buckets", async () => {
    const tokens = await Promise.all([
      mint("user-a"),
      mint("user-b"),
      mint("user-c"),
    ]);
    for (const token of tokens) {
      expect((await call(token)).statusCode).toBe(200);
    }
  });

  it("enforces the limit per verified identity", async () => {
    const token = await mint("user-d");
    const results = [
      snapshot(await call(token)),
      snapshot(await call(token)),
      snapshot(await call(token)),
    ];
    const lines = results.map((r) => `${r.status} ${r.body}`);
    expect(lines[0]).toMatch(/^200 /);
    expect(lines[1]).toMatch(/^200 /);
    expect(lines[2]).toMatch(/^429 /);
  });
});
