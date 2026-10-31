import * as p from "@clack/prompts";
import pc from "picocolors";
import path from "node:path";
import { execa } from "execa";
import { detect } from "../detect/index.js";

export interface MigrateOptions { cwd?: string; deploy?: boolean; yes?: boolean; }

export async function runMigrate(opts: MigrateOptions = {}) {
  const root = path.resolve(opts.cwd ?? process.cwd());
  p.intro(pc.cyan("sg migrate"));

  const detection = await detect(root);
  if (!detection.db.hasPrismaSchema) {
    p.cancel("No prisma/schema.prisma found. Run sg init first.");
    process.exit(1);
  }

  const deploy = Boolean(opts.deploy);
  const cmd = deploy ? "deploy" : "dev";
  const args = deploy ? ["prisma", "migrate", "deploy"] : ["prisma", "migrate", "dev"];

  if (!opts.yes) {
    const ok = await p.confirm({
      message: `Run \`npx ${args.join(" ")}\`?`,
      initialValue: true,
    });
    if (p.isCancel(ok) || !ok) { p.cancel("Aborted."); process.exit(0); }
  }

  const spinner = p.spinner();
  spinner.start("Running prisma migrate...");
  try {
    const res = await execa("npx", args, { cwd: root, stdio: "pipe" });
    spinner.stop("Migration complete.");
    if (res.stdout) p.note(res.stdout, "stdout");
  } catch (e: any) {
    spinner.stop("Migration failed.");
    p.log.error(e?.stderr || e?.message || String(e));
    process.exitCode = 1;
  }
  p.outro(pc.green("done."));
}
