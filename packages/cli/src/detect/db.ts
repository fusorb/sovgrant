import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import type { DbEngine } from "../lib/types.js";

export interface DbDetection {
  engine: DbEngine | "unknown";
  hasPrismaSchema: boolean;
  prismaSchemaPath?: string;
  hasDatabaseUrl: boolean;
  databaseUrl?: string;
  provider?: string; // prisma provider string
}

const ENV_KEYS: Record<string, string[]> = {
  postgres: ["DATABASE_URL", "POSTGRES_URL"],
  cockroach: ["DATABASE_URL", "POSTGRES_URL"],
  mongo: ["MONGODB_URI", "DATABASE_URL"],
  mongoose: ["MONGODB_URI", "DATABASE_URL"],
  dynamo: ["AWS_REGION", "DYNAMODB_TABLE_PREFIX", "DYNAMODB_ENDPOINT"],
};

export async function findPrismaSchema(cwd: string): Promise<string | null> {
  const candidates = [
    "prisma/schema.prisma",
    "schema.prisma",
    "db/schema.prisma",
  ];
  for (const c of candidates) {
    const p = path.join(cwd, c);
    if (fsSync.existsSync(p)) return c;
  }
  return null;
}

export async function readEnvFile(cwd: string, name: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const p = path.join(cwd, name);
  try {
    const raw = await fs.readFile(p, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  } catch {
    /* ignore */
  }
  return out;
}

export async function detectDb(cwd: string): Promise<DbDetection> {
  const result: DbDetection = {
    engine: "unknown",
    hasPrismaSchema: false,
    hasDatabaseUrl: false,
  };

  const schemaRel = await findPrismaSchema(cwd);
  if (schemaRel) {
    result.hasPrismaSchema = true;
    result.prismaSchemaPath = schemaRel;
    try {
      const raw = await fs.readFile(path.join(cwd, schemaRel), "utf8");
      const m = raw.match(/provider\s*=\s*"([^"]+)"/);
      if (m) {
        result.provider = m[1];
        const prov = m[1].toLowerCase();
        if (prov === "postgresql" || prov === "postgres") result.engine = "postgres";
        else if (prov === "cockroachdb") result.engine = "cockroach";
        else if (prov === "mongodb") result.engine = "mongo";
        else if (prov === "mysql") result.engine = "postgres"; // treat as sql-ish default
      }
    } catch {
      /* ignore */
    }
  }

  // env scan
  const envFiles = [".env", ".env.local", ".env.development", ".env.example"];
  const env: Record<string, string> = {};
  for (const f of envFiles) {
    Object.assign(env, await readEnvFile(cwd, f));
  }

  for (const key of ["DATABASE_URL", "POSTGRES_URL", "MONGODB_URI"]) {
    if (env[key]) {
      result.hasDatabaseUrl = true;
      result.databaseUrl = env[key];
      if (!result.hasPrismaSchema) {
        // infer from URL scheme
        if (env[key].startsWith("mongodb")) result.engine = result.engine === "unknown" ? "mongo" : result.engine;
        else if (env[key].startsWith("postgres")) result.engine = result.engine === "unknown" ? "postgres" : result.engine;
      }
    }
  }

  // dynamo
  if (env["AWS_REGION"] || env["DYNAMODB_TABLE_PREFIX"]) {
    if (result.engine === "unknown") result.engine = "dynamo";
  }

  // mongoose heuristic: dependency present
  // (handled by caller with pkg; here just engine stays unknown unless mongo url)

  if (result.engine === "unknown" && result.hasPrismaSchema === false && !result.hasDatabaseUrl) {
    result.engine = "unknown";
  }

  return result;
}

export function envKeysFor(engine: DbEngine): string[] {
  return ENV_KEYS[engine] ?? ["DATABASE_URL"];
}
