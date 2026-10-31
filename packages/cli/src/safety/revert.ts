import fs from "node:fs/promises";
import path from "node:path";
import { readManifest, writeManifest, manifestPath } from "./manifest.js";

export interface RevertResult {
  restored: string[];
  deleted: string[];
  skipped: string[];
}

/**
 * Revert all files recorded in the manifest, newest-first.
 * - If a backup exists, restore it.
 * - Otherwise delete the generated file (only if its current hash still matches
 *   the recorded hash, to avoid clobbering consumer edits).
 */
export async function revert(root: string): Promise<RevertResult> {
  const manifest = await readManifest(root);
  const result: RevertResult = { restored: [], deleted: [], skipped: [] };
  if (!manifest) return result;

  const entries = [...manifest.entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  for (const e of entries) {
    const abs = path.join(root, e.path);
    if (e.backupPath) {
      const absBackup = path.join(root, e.backupPath);
      try {
        await fs.copyFile(absBackup, abs);
        result.restored.push(e.path);
      } catch {
        result.skipped.push(e.path);
      }
      continue;
    }
    // no backup: delete only if unchanged
    let currentHash: string | null = null;
    try {
      const buf = await fs.readFile(abs, "utf8");
      // compute hash inline
      const { createHash } = await import("node:crypto");
      currentHash = createHash("sha256").update(buf, "utf8").digest("hex");
    } catch {
      currentHash = null;
    }
    if (currentHash !== null && currentHash !== e.contentHash) {
      result.skipped.push(e.path);
      continue;
    }
    try {
      await fs.unlink(abs);
      result.deleted.push(e.path);
    } catch {
      result.skipped.push(e.path);
    }
  }

  // Clear manifest
  try {
    await fs.unlink(manifestPath(root));
  } catch {
    /* ignore */
  }
  return result;
}
