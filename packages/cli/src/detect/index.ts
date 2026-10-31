import path from "node:path";
import { readPackageJson, detectPackageManager, detectMonorepo, detectFrontendStack, detectAuthLibs, detectFacet } from "./package.js";
import { detectDb } from "./db.js";
import { detectEnv, oauthEnvPresent } from "./env.js";
import { detectExistingCode } from "./existing-code.js";
import type { DetectionResult } from "../lib/types.js";

export async function detect(cwd: string): Promise<DetectionResult> {
  const pkg = await readPackageJson(cwd);
  const facet = detectFacet(pkg);
  const db = await detectDb(cwd);
  const env = await detectEnv(cwd);
  const existingCodePaths = await detectExistingCode(cwd);

  return {
    cwd,
    packageManager: detectPackageManager(cwd),
    isMonorepo: detectMonorepo(pkg),
    frontendStack: detectFrontendStack(pkg),
    existingAuth: detectAuthLibs(pkg),
    db: {
      engine: db.engine,
      hasPrismaSchema: db.hasPrismaSchema,
      prismaSchemaPath: db.prismaSchemaPath,
      hasDatabaseUrl: db.hasDatabaseUrl,
      databaseUrl: db.databaseUrl,
    },
    envFiles: env.files,
    existingCodePaths,
    hasFacetSdk: facet.sdk,
    hasFacetAuth: facet.auth,
  };
}

export { oauthEnvPresent };
export * from "./package.js";
export * from "./db.js";
export * from "./env.js";
export * from "./existing-code.js";
