import type { DbAdapter, AdapterContext } from "./base.js";
import type { ScaffoldFile } from "../lib/types.js";
import { postgresAdapter } from "./postgres.js";

// Cockroach is Prisma-compatible; reuse postgres schema with provider swap.
export const cockroachAdapter: DbAdapter = {
  ...postgresAdapter,
  name: "CockroachDB",
  engine: "cockroach",
  async generateSchema(ctx) {
    const files = await postgresAdapter.generateSchema(ctx);
    return files.map((f) => {
      if (f.relativePath.endsWith(".prisma")) {
        return { ...f, content: f.content.replace('provider = "postgresql"', 'provider = "cockroachdb"') };
      }
      return f;
    });
  },
  envKeys() {
    return ["DATABASE_URL"];
  },
};
