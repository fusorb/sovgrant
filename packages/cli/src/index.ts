#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runMigrate } from "./commands/migrate.js";
import { runSetupSdk, runSetupTenant } from "./commands/setup.js";
import { runRevert } from "./commands/revert.js";

const program = new Command();
program
  .name("sg")
  .description("SovGrant CLI — scaffold and audit a sovereign identity/auth backend.")
  .version("0.1.0");

program
  .command("init")
  .description("Provision SovGrant into the current repo.")
  .option("--cwd <dir>", "working directory", process.cwd())
  .option("--dry-run", "print intended writes without changing anything")
  .option("--force", "overwrite existing unregistered files (backs up first)")
  .option("--yes", "accept defaults non-interactively")
  .action(async (opts) => {
    await runInit({ cwd: opts.cwd, dryRun: opts.dryRun, force: opts.force, yes: opts.yes });
  });

program
  .command("doctor")
  .description("Audit the SovGrant integration.")
  .option("--cwd <dir>", "working directory", process.cwd())
  .action(async (opts) => {
    await runDoctor({ cwd: opts.cwd });
  });

program
  .command("migrate")
  .description("Wrap prisma migrate with safety guards.")
  .option("--cwd <dir>", "working directory", process.cwd())
  .option("--deploy", "use migrate deploy (production)")
  .option("--yes", "skip confirmation")
  .action(async (opts) => {
    await runMigrate({ cwd: opts.cwd, deploy: opts.deploy, yes: opts.yes });
  });

const setup = program.command("setup").description("Opinionated sub-scaffolds.");
setup
  .command("sdk")
  .description("Generate SgClient + env wiring for a frontend.")
  .option("--cwd <dir>", "working directory", process.cwd())
  .option("--force", "overwrite the wiring file if it already exists (backs up first)")
  .action(async (opts) => {
    await runSetupSdk({ cwd: opts.cwd, force: opts.force });
  });
setup
  .command("tenant")
  .description("Seed a tenant + admin + RBAC role set.")
  .option("--cwd <dir>", "working directory", process.cwd())
  .action(async (opts) => {
    await runSetupTenant({ cwd: opts.cwd });
  });

program
  .command("revert")
  .description("Restore pre-scaffold state from .sg/generated.json.")
  .option("--cwd <dir>", "working directory", process.cwd())
  .option("--yes", "skip confirmation")
  .action(async (opts) => {
    await runRevert({ cwd: opts.cwd, yes: opts.yes });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
