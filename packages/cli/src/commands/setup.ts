import * as p from "@clack/prompts";
import pc from "picocolors";
import path from "node:path";
import fs from "node:fs/promises";
import { detect } from "../detect/index.js";
import { safeWrite } from "../safety/index.js";
import { SDK_WIRING_NEXT } from "../templates/index.js";

export interface SetupOptions { cwd?: string; target?: string; force?: boolean; }

export async function runSetupSdk(opts: SetupOptions = {}) {
  const root = path.resolve(opts.cwd ?? process.cwd());
  p.intro(pc.cyan("sg setup sdk"));
  const detection = await detect(root);

  let relPath = "src/lib/sg-client.ts";
  if (detection.frontendStack === "vite" || detection.frontendStack === "plain") relPath = "src/sg-client.ts";
  if (detection.frontendStack === "expo") relPath = "src/services/sg-client.ts";
  if (detection.frontendStack === "remix") relPath = "app/lib/sg-client.ts";

  const res = await safeWrite({
    root,
    file: { relativePath: relPath, content: SDK_WIRING_NEXT },
    force: Boolean(opts.force),
  });
  if (res.action === "skipped") {
    p.log.warn(`${res.path} already exists; not overwriting. Use --force to overwrite.`);
  } else {
    p.log.success(`wrote ${res.path}`);
  }

  p.note(
    "Merge instructions:\n" +
      "- Ensure @fusorb/facet-sdk is installed.\n" +
      "- Set NEXT_PUBLIC_API_URL (or equivalent) to your SG backend.\n" +
      "- Wrap your app with the provider from the generated file.",
    "Next",
  );
  p.outro(pc.green("done."));
}

export async function runSetupTenant(opts: SetupOptions = {}) {
  const root = path.resolve(opts.cwd ?? process.cwd());
  p.intro(pc.cyan("sg setup tenant"));
  const seedPath = path.join(root, "prisma", "seed.sg.ts");
  try {
    await fs.access(seedPath);
    p.log.info("prisma/seed.sg.ts already exists.");
  } catch {
    p.log.warn("prisma/seed.sg.ts not found. Run sg init first.");
  }
  p.note(
    "Run: pnpm tsx prisma/seed.sg.ts\nThis seeds the SYSTEM tenant, admin user, and RBAC roles.",
    "Seed",
  );
  p.outro(pc.green("done."));
}
