import "dotenv/config";
import { defineConfig } from "prisma/config";

// Force load process env as an ultimate fallback if Prisma's native scanner chokes in MINGW64
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Prisma Config Error: DATABASE_URL is missing. " +
      "Please ensure your .env file exists in the root directory.",
  );
}

// Shadow database for `prisma migrate diff --from-migrations` (used by the
// migration rollback test). Optional - read defensively and fall back to the
// process env / sibling-DB derivation when it is genuinely absent.
const shadowEnv = process.env.SHADOW_DATABASE_URL;
const shadowDatabaseUrl =
  shadowEnv || databaseUrl.replace(/\/[^/]*\?/, "/sg_shadow?");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
    shadowDatabaseUrl,
  },
});
