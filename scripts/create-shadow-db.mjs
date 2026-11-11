#!/usr/bin/env node
/**
 * Creates the shadow database that `prisma migrate diff --from-migrations` needs.
 *
 * Why this exists: `prisma migrate diff --from-migrations` replays the migration
 * chain into a shadow database, but unlike `migrate dev` it will NOT create one -
 * it requires the database to already exist. CI's Postgres service only creates
 * DATABASE_URL's database, so the Tier-2 drift check in
 * `prisma/migrations/rollback.test.ts` cannot run until this has.
 *
 * Idempotent: safe on every CI run and locally. Prints only the database name,
 * never the connection string (it carries the password).
 *
 * Run: node scripts/create-shadow-db.mjs
 */
import { Client } from "pg";

/**
 * Mirrors the shadow resolution in prisma.config.ts exactly, so this creates the
 * database Prisma will actually use. An explicit SHADOW_DATABASE_URL wins - which
 * is how CI passes it.
 */
function resolveShadowUrl() {
  if (process.env.SHADOW_DATABASE_URL) return process.env.SHADOW_DATABASE_URL;

  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error("Set SHADOW_DATABASE_URL, or DATABASE_URL to derive it from");
  }

  const derived = base.replace(/\/[^/]*\?/, "/sg_shadow?");
  if (derived === base) {
    throw new Error(
      "Cannot derive a shadow database from DATABASE_URL (it needs a '?schema=' query, " +
        "as prisma.config.ts expects). Set SHADOW_DATABASE_URL explicitly.",
    );
  }
  return derived;
}

const shadowUrl = resolveShadowUrl();

const url = new URL(shadowUrl);
const dbName = decodeURIComponent(url.pathname.replace(/^\//, ""));
if (!dbName) throw new Error("Shadow database URL has no database name");

// Connect to the server's maintenance database to run CREATE DATABASE.
url.pathname = "/postgres";

const client = new Client({
  connectionString: url.toString(),
  connectionTimeoutMillis: 15000,
});

try {
  await client.connect();

  const existing = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    console.log(`shadow database "${dbName}" already exists`);
  } else {
    // CREATE DATABASE cannot take a bound parameter; quote the identifier.
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`created shadow database "${dbName}"`);
  }
} finally {
  await client.end();
}
