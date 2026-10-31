import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { safeWrite, safeWriteMany, readManifest } from "../src/safety/index.js";
import { revert } from "../src/safety/revert.js";

describe("safe-writer", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "sg-"));
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("creates a new file and records manifest", async () => {
    const res = await safeWrite({ root, file: { relativePath: "a.txt", content: "hello" } });
    expect(res.action).toBe("created");
    const content = await fs.readFile(path.join(root, "a.txt"), "utf8");
    expect(content).toBe("hello");
    const m = await readManifest(root);
    expect(m?.entries).toHaveLength(1);
    expect(m?.entries[0].path).toBe("a.txt");
  });

  it("skips existing unregistered file without force", async () => {
    await fs.writeFile(path.join(root, "b.txt"), "original", "utf8");
    const res = await safeWrite({ root, file: { relativePath: "b.txt", content: "new" } });
    expect(res.action).toBe("skipped");
    const content = await fs.readFile(path.join(root, "b.txt"), "utf8");
    expect(content).toBe("original");
  });

  it("overwrites with force and backs up", async () => {
    await fs.writeFile(path.join(root, "c.txt"), "original", "utf8");
    const res = await safeWrite({ root, file: { relativePath: "c.txt", content: "new" }, force: true });
    expect(res.action).toBe("overwritten");
    expect(res.backupPath).toBeTruthy();
    const content = await fs.readFile(path.join(root, "c.txt"), "utf8");
    expect(content).toBe("new");
    const backup = await fs.readFile(path.join(root, res.backupPath!), "utf8");
    expect(backup).toBe("original");
  });

  it("dry-run writes nothing", async () => {
    const res = await safeWrite({ root, file: { relativePath: "d.txt", content: "x" }, dryRun: true });
    expect(res.action).toBe("dry-run");
    await expect(fs.access(path.join(root, "d.txt"))).rejects.toBeTruthy();
  });

  it("revert restores state", async () => {
    await safeWrite({ root, file: { relativePath: "e.txt", content: "generated" } });
    const r = await revert(root);
    expect(r.deleted).toContain("e.txt");
    await expect(fs.access(path.join(root, "e.txt"))).rejects.toBeTruthy();
  });

  it("safeWriteMany writes multiple", async () => {
    const results = await safeWriteMany(root, [
      { relativePath: "f1.txt", content: "1" },
      { relativePath: "f2.txt", content: "2" },
    ]);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.action === "created")).toBe(true);
  });
});
