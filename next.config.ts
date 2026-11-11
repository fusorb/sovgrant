import type { NextConfig } from "next";
import path from "node:path";
import { createRequire } from "node:module";
import fs from "node:fs";

// Canonicalize the project root to its real on-disk casing. On Windows the
// shell can report a lowercase path (C:\Users\HP\desktop\...\sovgrant) while
// the real path is proper-case (C:\Users\HP\Desktop\...\sovgrant). Bundlers
// treat the two spellings as different module ids, which doubles
// Next/React/facet modules and causes "invariant expected layout router to be
// mounted" on hydration. Using the real-case root everywhere keeps module ids
// consistent - for both Turbopack and the webpack fallback.
const PROJECT_ROOT = (() => {
  try {
    return fs.realpathSync.native(process.cwd());
  } catch {
    return process.cwd();
  }
})();

const r = createRequire(import.meta.url);

/**
 * react-hook-form@7.x ships a `react-server` export condition whose entry
 * (./dist/react-server.esm.mjs) omits useForm / Controller / FormProvider /
 * useFormContext. facet-auth's compiled dist imports `react-hook-form` bare,
 * so under Next.js RSC the bundler resolves via `react-server` and the form
 * hooks go missing. We resolve the package's `import` condition to an absolute
 * file path: an absolute path is loaded directly and bypasses the `exports`
 * map, so strict-exports is satisfied while the full ESM export surface is
 * forced.
 */
function resolveRhfImportEntry(): string {
  try {
    const facetPkgPath = r.resolve("@fusorb/facet-auth/package.json", {
      paths: [PROJECT_ROOT],
    });
    const rhfPkgPath = r.resolve("react-hook-form/package.json", {
      paths: [path.dirname(facetPkgPath)],
    });
    const rhfPkg = r(rhfPkgPath);
    const entrypoint = rhfPkg?.exports?.["."]?.import ?? "dist/index.esm.mjs";
    return path.resolve(path.dirname(rhfPkgPath), entrypoint);
  } catch {
    return "react-hook-form";
  }
}

// ── Shared alias table ───────────────────────────────────────────────────────
// Applied to BOTH bundlers. The two facet CSS files must be resolved to their
// real dist paths because the CSS `@import` resolver does not honor the
// package `exports` map for subpath files; react-hook-form is pinned to its
// full ESM entry (see resolveRhfImportEntry above).
const FACET_TOKENS_CSS = path.join(
  PROJECT_ROOT,
  "node_modules/@fusorb/facet-tokens/dist/tokens.css",
);
const FACET_TAILWIND_CSS = path.join(
  PROJECT_ROOT,
  "node_modules/@fusorb/facet-tokens/dist/tailwind.css",
);

const sharedAliases: Record<string, string> = {
  "@fusorb/facet-tokens/tokens.css": FACET_TOKENS_CSS,
  "@fusorb/facet-tokens/tailwind.css": FACET_TAILWIND_CSS,
  "react-hook-form": resolveRhfImportEntry(),
};

// ── Webpack fallback helpers (only used by `next dev --webpack`) ─────────────

/**
 * Normalize webpack module paths to their real on-disk casing.
 *
 * Webpack resolves through both the lowercase cwd and the real-case path,
 * loading Next.js internals twice -> duplicate-module warnings and, on
 * hydration, "invariant expected layout router to be mounted".
 */
class RealCasePathPlugin {
  apply(compiler: any) {
    const realCase = (p: string) => {
      try {
        return fs.realpathSync.native(p);
      } catch {
        return p;
      }
    };

    compiler.hooks.normalModuleFactory.tap(
      "RealCasePathPlugin",
      (factory: any) => {
        factory.hooks.afterResolve.tap("RealCasePathPlugin", (data: any) => {
          if (data?.createData?.resource) {
            const realPath = realCase(data.createData.resource);
            data.createData.resource = realPath;
            if (data.createData.userRequest) {
              data.createData.userRequest = realPath;
            }
            if (data.createData.context) {
              data.createData.context = realCase(data.createData.context);
            }
          }
        });
      },
    );
  }
}

/**
 * Hooks into enhanced-resolve's pipeline directly (at the resolver level,
 * before the module factory), so all module resolutions are normalized -
 * including imports from Next.js page entry points that may bypass
 * NormalModuleFactory hooks.
 */
class NormalizePathPlugin {
  apply(resolver: any) {
    const realCase = (p: string) => {
      try {
        return fs.realpathSync.native(p);
      } catch {
        return p;
      }
    };

    resolver.getHook("result").tapAsync(
      "NormalizePathPlugin",
      (result: any, _resolveContext: any, callback: () => void) => {
        if (result?.resource) {
          result.resource = realCase(result.resource);
        }
        callback();
      },
    );
  }
}

const nextConfig: NextConfig = {
  // Explicit project root so Turbopack doesn't mis-infer the workspace root
  // from the pnpm-store layout sitting beside this repo.
  turbopack: {
    root: PROJECT_ROOT,
    resolveAlias: sharedAliases,
  },

  allowedDevOrigins: ["169.254.94.46", "localhost:3000"],

  // Webpack fallback: `pnpm dev:web:webpack`. Turbopack is the default dev
  // bundler (Next 16); this block keeps the proven Windows fixes available
  // without any other change if Turbopack regresses on this machine.
  webpack: (config) => {
    // 1) Normalize module paths to real-case (Windows casing collision).
    config.plugins = [...(config.plugins ?? []), new RealCasePathPlugin()];

    // Ensure symlinks are resolved so realpaths are computed for all modules.
    config.resolve.symlinks = true;

    // 2) Override Next.js's internal @/ alias to the real-case project root,
    //    and apply the shared facet/react-hook-form aliases.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.join(PROJECT_ROOT, "src"),
      "@/": path.join(PROJECT_ROOT, "src") + "/",
      ...sharedAliases,
    };

    // 3) Resolver-level casing normalization for paths that bypass the
    //    NormalModuleFactory hooks.
    config.resolve.plugins = [
      ...(config.resolve.plugins ?? []),
      new NormalizePathPlugin(),
    ];

    return config;
  },

  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "argon2",
  ],

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
