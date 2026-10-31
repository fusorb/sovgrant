import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { detect } from "../src/detect/index.js";

describe("detect", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "sgdetect-"));
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("detects a next.js project with prisma", async () => {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({
      dependencies: { next: "16.0.0", react: "19.0.0", "@fusorb/facet-sdk": "2.0.0" },
    }), "utf8");
    await fs.mkdir(path.join(root, "prisma"), { recursive: true });
    await fs.writeFile(path.join(root, "prisma", "schema.prisma"), 'datasource db { provider = "postgresql" }', "utf8");
    await fs.writeFile(path.join(root, ".env"), 'DATABASE_URL="postgresql://u:p@localhost:5432/db"\nJWT_SECRET=abc', "utf8");

    const d = await detect(root);
    expect(d.frontendStack).toBe("next");
    expect(d.db.engine).toBe("postgres");
    expect(d.db.hasPrismaSchema).toBe(true);
    expect(d.hasFacetSdk).toBe(true);
    expect(d.db.hasDatabaseUrl).toBe(true);
  });

  it("returns unknown for empty dir", async () => {
    const d = await detect(root);
    expect(d.frontendStack).toBe("unknown");
    expect(d.db.engine).toBe("unknown");
  });
});
