import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Manifest, ManifestEntry } from "../lib/types.js";

export const MANIFEST_DIR = ".sg";
export const MANIFEST_FILE = "generated.json";
export const BACKUP_DIR = "backups";

export function manifestPath(root: string): string {
  return path.join(root, MANIFEST_DIR, MANIFEST_FILE);
}

export function backupRoot(root: string): string {
  return path.join(root, MANIFEST_DIR, BACKUP_DIR);
}

export async function readManifest(root: string): Promise<Manifest | null> {
  try {
    const raw = await fs.readFile(manifestPath(root), "utf8");
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

export async function writeManifest(root: string, manifest: Manifest): Promise<void> {
  const dir = path.join(root, MANIFEST_DIR);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(manifestPath(root), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

export function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export async function ensureGitignore(root: string): Promise<void> {
  const gi = path.join(root, ".gitignore");
  try {
    const existing = await fs.readFile(gi, "utf8");
    if (existing.includes(".sg/")) return;
    await fs.appendFile(gi, "\n# SovGrant CLI generated state\n.sg/\n", "utf8");
  } catch {
    await fs.writeFile(gi, "# SovGrant CLI generated state\n.sg/\n", "utf8");
  }
}

export type { Manifest, ManifestEntry };
