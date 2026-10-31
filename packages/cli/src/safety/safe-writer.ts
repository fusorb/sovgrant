import fs from "node:fs/promises";
import path from "node:path";
import { readManifest, writeManifest, sha256, backupRoot } from "./manifest.js";
import type { Manifest, ManifestEntry, ScaffoldFile } from "../lib/types.js";

export interface WriteOptions {
  root: string;
  file: ScaffoldFile;
  force?: boolean;
  dryRun?: boolean;
  adapter?: string;
}

export interface WriteResult {
  path: string;
  action: "created" | "skipped" | "overwritten" | "dry-run";
  reason?: string;
  backupPath?: string;
}

/**
 * Safe write: never clobbers an unregistered existing file unless force.
 * Returns a result describing what happened. Manifest updated on real writes.
 */
export async function safeWrite(opts: WriteOptions): Promise<WriteResult> {
  const { root, file, force = false, dryRun = false, adapter } = opts;
  const abs = path.join(root, file.relativePath);
  const manifest = (await readManifest(root)) ?? { version: 1 as const, root, entries: [] };
  const registered = manifest.entries.some((e) => e.path === file.relativePath);

  // Existence check
  let exists = false;
  try {
    await fs.access(abs);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists && !registered && !force) {
    return { path: file.relativePath, action: "skipped", reason: "file exists and is not registered; use --force" };
  }

  if (dryRun) {
    return { path: file.relativePath, action: "dry-run" };
  }

  // Backup on force overwrite of an existing registered-or-not file
  let backupPath: string | undefined;
  if (exists && force) {
    const relBackup = path.join(".sg", "backups", file.relativePath);
    const absBackup = path.join(root, relBackup);
    await fs.mkdir(path.dirname(absBackup), { recursive: true });
    await fs.copyFile(abs, absBackup);
    backupPath = relBackup;
  }

  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, file.content, "utf8");
  if (file.mode) await fs.chmod(abs, file.mode);

  // Update manifest
  const entry: ManifestEntry = {
    path: file.relativePath,
    contentHash: sha256(file.content),
    timestamp: new Date().toISOString(),
    forced: force && exists,
    adapter,
    backupPath,
  };
  // replace existing entry for same path
  manifest.entries = manifest.entries.filter((e) => e.path !== file.relativePath);
  manifest.entries.push(entry);
  await writeManifest(root, manifest);

  return {
    path: file.relativePath,
    action: exists ? "overwritten" : "created",
    backupPath,
  };
}

export async function safeWriteMany(
  root: string,
  files: ScaffoldFile[],
  opts: { force?: boolean; dryRun?: boolean; adapter?: string } = {},
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  for (const f of files) {
    results.push(await safeWrite({ root, file: f, ...opts }));
  }
  return results;
}
