import fs from "node:fs/promises";
import path from "node:path";
import { readEnvFile } from "./db.js";

export interface EnvDetection {
  files: string[];
  present: Record<string, string>;
  hasResend: boolean;
  hasJwtSecret: boolean;
  hasCookieSecret: boolean;
}

export async function detectEnv(cwd: string): Promise<EnvDetection> {
  const candidates = [".env", ".env.local", ".env.development", ".env.example", ".env.sample"];
  const files: string[] = [];
  const present: Record<string, string> = {};
  for (const f of candidates) {
    try {
      await fs.access(path.join(cwd, f));
      files.push(f);
      Object.assign(present, await readEnvFile(cwd, f));
    } catch {
      /* skip */
    }
  }
  return {
    files,
    present,
    hasResend: Boolean(present["RESEND_API_KEY"]),
    hasJwtSecret: Boolean(present["JWT_SECRET"]),
    hasCookieSecret: Boolean(present["COOKIE_SECRET"]),
  };
}

export function oauthEnvPresent(env: Record<string, string>): boolean {
  return Boolean(env["OIDC_ISSUER"] || env["JWKS_URL"] || env["OAUTH_CLIENT_ID"]);
}
