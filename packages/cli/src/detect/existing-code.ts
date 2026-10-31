import fs from "node:fs/promises";
import path from "node:path";
import fsSync from "node:fs";

export async function detectExistingCode(cwd: string): Promise<string[]> {
  const found: string[] = [];
  const probes = [
    "src/sdk",
    "src/lib/auth",
    "src/lib/sg-client.ts",
    "src/lib/sg.ts",
    "src/sg",
    "lib/auth.ts",
    "auth.ts",
    "src/auth",
  ];
  for (const p of probes) {
    if (fsSync.existsSync(path.join(cwd, p))) found.push(p);
  }
  // scan src for auth-ish files
  try {
    const entries = await fs.readdir(path.join(cwd, "src"), { withFileTypes: true });
    for (const e of entries) {
      if (e.name.toLowerCase().includes("auth")) found.push(`src/${e.name}`);
    }
  } catch {
    /* ignore */
  }
  return Array.from(new Set(found));
}
