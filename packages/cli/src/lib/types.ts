// Shared types for the sg CLI.

export type DbEngine = "postgres" | "cockroach" | "mongo" | "mongoose" | "dynamo";

export type SgRole = "auth-only" | "auth+oauth-provider" | "oauth-client";

export type FrontendStack =
  | "next"
  | "remix"
  | "vite"
  | "expo"
  | "plain"
  | "python"
  | "unknown";

export interface ScaffoldFile {
  /** Path relative to consumer root. */
  relativePath: string;
  /** File content. */
  content: string;
  /** Whether this is a binary-ish template (always text here). */
  mode?: number;
}

export interface ManifestEntry {
  path: string; // relative
  contentHash: string; // sha256 of written content
  timestamp: string; // ISO
  forced: boolean;
  adapter?: string;
  backupPath?: string; // relative path of backup if forced
}

export interface Manifest {
  version: 1;
  root: string;
  entries: ManifestEntry[];
}

export interface DetectionResult {
  cwd: string;
  packageManager: "pnpm" | "npm" | "yarn" | "bun" | "unknown";
  isMonorepo: boolean;
  frontendStack: FrontendStack;
  existingAuth: string[]; // detected libs
  db: {
    engine: DbEngine | "unknown";
    hasPrismaSchema: boolean;
    prismaSchemaPath?: string;
    hasDatabaseUrl: boolean;
    databaseUrl?: string;
  };
  envFiles: string[];
  existingCodePaths: string[]; // src/sdk, src/lib/auth, etc.
  hasFacetSdk: boolean;
  hasFacetAuth: boolean;
}
