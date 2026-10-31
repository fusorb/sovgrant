import * as p from "@clack/prompts";
import pc from "picocolors";
import path from "node:path";
import fs from "node:fs/promises";
import { detect } from "../detect/index.js";
import { ADAPTERS, getAdapter } from "../adapters/index.js";
import { safeWrite, safeWriteMany, ensureGitignore } from "../safety/index.js";
import { genJwtSecret, genCookieSecret, genWebhookSecret, genLocalKmsKey, mergeSecretBlock } from "../secrets/index.js";
import { ENV_SG_EXAMPLE, SDK_WIRING_NEXT, SG_INTEGRATION_MD } from "../templates/index.js";
import type { ScaffoldFile } from "../lib/types.js";

export interface InitOptions {
  cwd?: string;
  dryRun?: boolean;
  force?: boolean;
  yes?: boolean;
}

export async function runInit(opts: InitOptions = {}) {
  const root = path.resolve(opts.cwd ?? process.cwd());

  p.intro(pc.cyan("sg init — SovGrant provisioning"));

  const detection = await detect(root);
  p.note(
    `stack: ${detection.frontendStack} | db: ${detection.db.engine} | pm: ${detection.packageManager}\n` +
      `existing auth: ${detection.existingAuth.join(", ") || "none"}\n` +
      `facet-sdk: ${detection.hasFacetSdk} | facet-auth: ${detection.hasFacetAuth}`,
    "Detection",
  );

  // Role
  let role: "auth-only" | "auth+oauth-provider" | "oauth-client" = "auth-only";
  if (!opts.yes) {
    const r = await p.select({
      message: "How will you use SovGrant?",
      options: [
        { value: "auth-only", label: "Auth only (password/passkey/MFA/magic-link)" },
        { value: "auth+oauth-provider", label: "Auth + OAuth/OIDC provider (SG issues tokens)" },
        { value: "oauth-client", label: "OAuth client only (consume SG as IdP)" },
      ],
      initialValue: "auth-only",
    });
    if (p.isCancel(r)) { p.cancel("Aborted."); process.exit(0); }
    role = r as any;
  }

  // DB engine
  let dbChoice = detection.db.engine === "cockroach" ? "cockroach" : "postgres";
  if (!opts.yes) {
    const r = await p.select({
      message: "Database engine",
      options: [
        { value: "postgres", label: "PostgreSQL (recommended)" },
        { value: "cockroach", label: "CockroachDB" },
      ],
      initialValue: dbChoice,
    });
    if (p.isCancel(r)) { p.cancel("Aborted."); process.exit(0); }
    dbChoice = r as string;
  }

  const adapter = getAdapter(dbChoice);
  if (!adapter) {
    p.cancel(`No adapter for ${dbChoice} yet (deferred to a later phase).`);
    process.exit(1);
  }

  // Confirm DB change
  if (detection.db.hasPrismaSchema && !opts.yes) {
    const ok = await p.confirm({
      message: `A Prisma schema was detected (${detection.db.prismaSchemaPath}). sg will write a SEPARATE schema.sg.prisma and NOT modify your schema. Continue?`,
      initialValue: true,
    });
    if (p.isCancel(ok) || !ok) { p.cancel("Aborted."); process.exit(0); }
  }

  // Scope
  let scope: string[] = ["env", "schema", "secrets", "sdk", "compose", "integration"];
  if (!opts.yes) {
    const r = await p.multiselect({
      message: "What should sg scaffold?",
      options: [
        { value: "env", label: "Env template (.env.sg.example)" },
        { value: "schema", label: "DB schema + seed (prisma/schema.sg.prisma)" },
        { value: "secrets", label: "Generate secrets into .env.local" },
        { value: "sdk", label: "SDK client wiring" },
        { value: "compose", label: "docker-compose.sg.yml" },
        { value: "integration", label: "SG_INTEGRATION.md" },
      ],
      initialValues: scope,
      required: false,
    });
    if (p.isCancel(r)) { p.cancel("Aborted."); process.exit(0); }
    scope = r as string[];
  }

  const dryRun = Boolean(opts.dryRun);
  const force = Boolean(opts.force);

  const files: ScaffoldFile[] = [];

  if (scope.includes("env")) {
    files.push({ relativePath: ".env.sg.example", content: ENV_SG_EXAMPLE });
  }

  if (scope.includes("schema")) {
    const adapterFiles = await adapter.generateSchema({
      root,
      engine: adapter.engine,
      detection: detection.db as any,
      role,
    });
    files.push(...adapterFiles);
  }

  if (scope.includes("sdk")) {
    const sdkPath = detection.frontendStack === "next" ? "src/lib/sg-client.ts" : "src/sg-client.ts";
    files.push({ relativePath: sdkPath, content: SDK_WIRING_NEXT });
  }

  if (scope.includes("integration")) {
    files.push({ relativePath: "SG_INTEGRATION.md", content: SG_INTEGRATION_MD });
  }

  // Secrets generation
  if (scope.includes("secrets")) {
    const secrets = {
      JWT_SECRET: genJwtSecret(),
      COOKIE_SECRET: genCookieSecret(),
      WEBHOOK_SIGNING_SECRET: genWebhookSecret(),
      LOCAL_KMS_KEY: genLocalKmsKey(),
    };
    // read existing env.local
    let existing = "";
    const envLocalPath = path.join(root, ".env.local");
    try { existing = await fs.readFile(envLocalPath, "utf8"); } catch { /* none */ }
    const merged = mergeSecretBlock(existing, secrets, false);
    files.push({ relativePath: ".env.local", content: merged });
  }

  await ensureGitignore(root);

  const spinner = p.spinner();
  spinner.start(dryRun ? "Planning writes (dry-run)..." : "Writing files...");

  const results = await safeWriteMany(root, files, { force, dryRun, adapter: adapter.engine });

  spinner.stop("Done.");

  for (const r of results) {
    const icon = r.action === "skipped" ? pc.yellow("skip") : r.action === "dry-run" ? pc.gray("plan") : pc.green("write");
    p.log.info(`${icon} ${r.path}${r.reason ? ` (${r.reason})` : ""}`);
  }

  p.note(
    [
      "Next steps:",
      "1. Set remaining env in .env.sg (RESEND_API_KEY, OAuth provider secrets, billing keys).",
      "2. Merge prisma/schema.sg.prisma into your schema and run: npx prisma migrate dev --name sg_init",
      "3. Run seed: pnpm tsx prisma/seed.sg.ts",
      "4. Run: sg doctor",
      "Revert everything with: sg revert",
    ].join("\n"),
    "Next",
  );

  p.outro(pc.green("sg init complete."));
}
