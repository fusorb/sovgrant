import * as p from "@clack/prompts";
import pc from "picocolors";
import path from "node:path";
import { detect } from "../detect/index.js";
import { getAdapter } from "../adapters/index.js";
import { readManifest } from "../safety/manifest.js";
import { ENV_SG_EXAMPLE } from "../templates/index.js";

export interface DoctorOptions { cwd?: string; }

export async function runDoctor(opts: DoctorOptions = {}) {
  const root = path.resolve(opts.cwd ?? process.cwd());
  p.intro(pc.cyan("sg doctor"));

  const detection = await detect(root);
  const manifest = await readManifest(root);

  const checks: { name: string; ok: boolean; warn?: boolean; detail: string }[] = [];

  // Env required
  checks.push({
    name: "package.json",
    ok: detection.frontendStack !== "unknown" || true,
    detail: `stack=${detection.frontendStack}`,
  });

  // secrets
  const envLocal = (detection as any).envFiles?.includes(".env.local");
  checks.push({
    name: "JWT_SECRET present",
    ok: Boolean((await readEnvValue(root, "JWT_SECRET"))),
    warn: true,
    detail: "required for auth tokens",
  });
  checks.push({
    name: "COOKIE_SECRET present",
    ok: Boolean(await readEnvValue(root, "COOKIE_SECRET")),
    warn: true,
    detail: "required for cookies",
  });

  // DB
  const adapter = getAdapter(detection.db.engine === "unknown" ? "postgres" : detection.db.engine);
  if (adapter) {
    const probe = await adapter.probe({ root, engine: adapter.engine, detection: detection.db as any, role: "auth-only" });
    checks.push({
      name: `DB reachable (${adapter.engine})`,
      ok: probe.ok,
      detail: probe.ok ? (probe.version ?? "ok") : (probe.error ?? "unreachable"),
    });
  }

  // manifest
  checks.push({
    name: "sg manifest present",
    ok: Boolean(manifest),
    warn: true,
    detail: manifest ? `${manifest.entries.length} generated files` : "no sg init run yet",
  });

  // facet sdk
  checks.push({
    name: "@fusorb/facet-sdk",
    ok: detection.hasFacetSdk,
    warn: true,
    detail: detection.hasFacetSdk ? "installed" : "not installed (needed for SDK wiring)",
  });

  // resend (consumer-provided)
  const resend = await readEnvValue(root, "RESEND_API_KEY");
  checks.push({
    name: "RESEND_API_KEY (consumer-provided)",
    ok: Boolean(resend),
    warn: true,
    detail: resend ? "set" : "MISSING — auth emails will not send (SG does not configure email)",
  });

  // print
  let errors = 0;
  let warns = 0;
  for (const c of checks) {
    const mark = c.ok ? pc.green("✔") : c.warn ? pc.yellow("⚠") : pc.red("✖");
    if (!c.ok) (c.warn ? warns++ : errors++);
    p.log.info(`${mark} ${c.name} — ${c.detail}`);
  }

  if (errors > 0) {
    p.outro(pc.red(`sg doctor: ${errors} error(s), ${warns} warning(s).`));
    process.exitCode = 2;
  } else if (warns > 0) {
    p.outro(pc.yellow(`sg doctor: ${warns} warning(s).`));
    process.exitCode = 1;
  } else {
    p.outro(pc.green("sg doctor: all checks passed."));
  }
}

async function readEnvValue(root: string, key: string): Promise<string | undefined> {
  const { readEnvFile } = await import("../detect/db.js");
  const envs = [".env", ".env.local", ".env.sg", ".env.example"];
  for (const f of envs) {
    const vals = await readEnvFile(root, f);
    if (vals[key]) return vals[key];
  }
  return process.env[key];
}
