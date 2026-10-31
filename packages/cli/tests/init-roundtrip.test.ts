import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { detect } from "../src/detect/index.js";
import { getAdapter } from "../src/adapters/index.js";
import { safeWriteMany, readManifest } from "../src/safety/index.js";
import { revert } from "../src/safety/revert.js";
import { ensureGitignore } from "../src/safety/manifest.js";

describe("init round-trip (non-interactive)", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "sginit-"));
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { next: "16.0.0" } }), "utf8");
    await fs.mkdir(path.join(root, "prisma"), { recursive: true });
    await fs.writeFile(path.join(root, "prisma", "schema.prisma"), 'datasource db { provider = "postgresql" }\n', "utf8");
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("generates files, records manifest, and reverts cleanly", async () => {
    const detection = await detect(root);
    const adapter = getAdapter("postgres")!;
    const files = await adapter.generateSchema({ root, engine: "postgres", detection: detection.db as any, role: "auth-only" });
    // add env + integration like init does
    files.push({ relativePath: ".env.sg.example", content: "NODE_ENV=development\n" });
    files.push({ relativePath: "SG_INTEGRATION.md", content: "# integration\n" });

    await ensureGitignore(root);

    const results = await safeWriteMany(root, files, { adapter: "postgres" });
    expect(results.every((r) => r.action === "created")).toBe(true);

    const manifest = await readManifest(root);
    expect(manifest?.entries.length).toBe(files.length);

    // verify a generated file exists
    const exists = await fs.access(path.join(root, "prisma", "schema.sg.prisma")).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    // revert
    const r = await revert(root);
    expect(r.deleted.length + r.restored.length).toBe(files.length);
    const after = await fs.access(path.join(root, "prisma", "schema.sg.prisma")).then(() => true).catch(() => false);
    expect(after).toBe(false);
  });

  it("dry-run writes nothing", async () => {
    const detection = await detect(root);
    const adapter = getAdapter("postgres")!;
    const files = await adapter.generateSchema({ root, engine: "postgres", detection: detection.db as any, role: "auth-only" });
    const results = await safeWriteMany(root, files, { dryRun: true });
    expect(results.every((r) => r.action === "dry-run")).toBe(true);
    const exists = await fs.access(path.join(root, "prisma", "schema.sg.prisma")).then(() => true).catch(() => false);
    expect(exists).toBe(false);
  });
});
