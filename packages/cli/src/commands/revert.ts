import * as p from "@clack/prompts";
import pc from "picocolors";
import path from "node:path";
import { revert } from "../safety/revert.js";

export interface RevertOptions { cwd?: string; yes?: boolean; }

export async function runRevert(opts: RevertOptions = {}) {
  const root = path.resolve(opts.cwd ?? process.cwd());
  p.intro(pc.cyan("sg revert"));

  if (!opts.yes) {
    const ok = await p.confirm({
      message: "Revert all files recorded in .sg/generated.json?",
      initialValue: false,
    });
    if (p.isCancel(ok) || !ok) { p.cancel("Aborted."); process.exit(0); }
  }

  const res = await revert(root);
  p.log.info(`restored: ${res.restored.length}, deleted: ${res.deleted.length}, skipped: ${res.skipped.length}`);
  for (const s of res.skipped) p.log.warn(`skipped (modified): ${s}`);
  p.outro(pc.green("done."));
}
