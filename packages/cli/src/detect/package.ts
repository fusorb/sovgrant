import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import type { DetectionResult, FrontendStack, DbEngine } from "../lib/types.js";

export async function readPackageJson(cwd: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(path.join(cwd, "package.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function detectPackageManager(cwd: string): DetectionResult["packageManager"] {
  if (fsSync.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fsSync.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fsSync.existsSync(path.join(cwd, "bun.lockb"))) return "bun";
  if (fsSync.existsSync(path.join(cwd, "package-lock.json"))) return "npm";
  return "unknown";
}

export function detectMonorepo(pkg: any): boolean {
  return Boolean(pkg?.workspaces);
}

export function detectFrontendStack(pkg: any): FrontendStack {
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  if (deps?.next) return "next";
  if (deps?.["@remix-run/react"] || deps?.remix) return "remix";
  if (deps?.vite) return "vite";
  if (deps?.expo) return "expo";
  if (deps?.fastapi || deps?.django || deps?.flask) return "python";
  if (deps?.react) return "plain";
  return "unknown";
}

export function detectAuthLibs(pkg: any): string[] {
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const known = [
    "@fusorb/facet-auth",
    "@fusorb/facet-sdk",
    "next-auth",
    "passport",
    "lucia",
    "better-auth",
    "clerk",
    "auth0",
  ];
  return known.filter((k) => Boolean(deps?.[k]));
}

export function detectFacet(pkg: any): { sdk: boolean; auth: boolean } {
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  return {
    sdk: Boolean(deps?.["@fusorb/facet-sdk"]),
    auth: Boolean(deps?.["@fusorb/facet-auth"]),
  };
}
