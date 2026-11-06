import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated code and build output. ESLint's flat config does not read
    // .gitignore, so generated trees have to be listed here explicitly - the
    // generated Prisma client alone otherwise contributes ~1.2k problems.
    "prisma/generated/**",
    "dist/**",
    "packages/*/dist/**",
    "coverage/**",
    ".agent/**",
  ]),
  {
    rules: {
      // `any` is a strictness signal rather than a defect. Kept visible as a
      // warning so the existing debt stays measurable without blocking the
      // pipeline; rules that catch real defects stay at `error`.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Only the characters that genuinely break JSX. A bare apostrophe in
      // prose is escaped correctly by React, so flagging it just churns copy.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
      // New in the React 19 / Next 16 rule set. It flags the ordinary
      // fetch-on-mount pattern, and the 4 current sites sit in auth-critical
      // pages (verify-email, invites/accept) whose rewrite is planned
      // post-launch. Left visible as a warning rather than a blocker.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
