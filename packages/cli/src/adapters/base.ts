import type { DbEngine, ScaffoldFile } from "../lib/types.js";
export type { DbEngine };

export interface DbDetection {
  engine: DbEngine | "unknown";
  hasPrismaSchema: boolean;
  prismaSchemaPath?: string;
  hasDatabaseUrl: boolean;
  databaseUrl?: string;
  provider?: string;
}

export interface AdapterContext {
  root: string;
  engine: DbEngine;
  detection: DbDetection;
  role: "auth-only" | "auth+oauth-provider" | "oauth-client";
}

export interface DbAdapter {
  name: string;
  engine: DbEngine;
  detect(root: string): Promise<DbDetection>;
  generateSchema(ctx: AdapterContext): Promise<ScaffoldFile[]>;
  envKeys(): string[];
  probe(ctx: AdapterContext): Promise<{ ok: boolean; version?: string; error?: string }>;
  migrationInstructions(ctx: AdapterContext): string[];
}
