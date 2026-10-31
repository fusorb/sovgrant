import type { DbAdapter, AdapterContext, DbDetection } from "./base.js";
import type { ScaffoldFile } from "../lib/types.js";
import { detectDb } from "../detect/db.js";

const CANONICAL_SCHEMA = `// SovGrant canonical identity + auth models (managed by sg).
// Merge into your prisma/schema.prisma, or keep as a separate file and
// reference via Prisma multi-file schema support (Prisma 7+).

datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

enum UserStatus {
  ACTIVE
  INACTIVE
  VERIFIED
  SUSPENDED
  BANNED
  DELETED
  PENDING
}

model Identity {
  id            String      @id @default(uuid())
  email         String      @unique
  emailVerified Boolean     @default(false)
  passwordHash  String?
  status        UserStatus  @default(PENDING)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  sessions      Session[]
  refreshTokens RefreshToken[]
  accessTokens  AccessToken[]
  memberships   TenantMembership[]
  externalIds   ExternalIdentifier[]
  consents      LegalConsent[]
  wallets       Wallet[]
}

model Session {
  id        String   @id @default(uuid())
  identityId String
  identity  Identity @relation(fields: [identityId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  aal       Int      @default(1)
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  refreshTokens RefreshToken[]
  accessTokens  AccessToken[]
}

model RefreshToken {
  id         String    @id @default(uuid())
  sessionId  String
  session    Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  identityId String
  identity   Identity  @relation(fields: [identityId], references: [id], onDelete: Cascade)
  tokenHash  String    @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())
}

model AccessToken {
  jti        String   @id
  sessionId  String
  session    Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  identityId String
  identity   Identity @relation(fields: [identityId], references: [id], onDelete: Cascade)
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}

model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  plan      String   @default("FREE")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  memberships TenantMembership[]
}

model TenantMembership {
  id         String   @id @default(uuid())
  tenantId   String
  tenant     Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  identityId String
  identity   Identity @relation(fields: [identityId], references: [id], onDelete: Cascade)
  role       String   @default("MEMBER")
  status     String   @default("ACTIVE")
  createdAt  DateTime @default(now())

  @@unique([tenantId, identityId])
}

model ExternalIdentifier {
  id         String   @id @default(uuid())
  identityId String
  identity   Identity @relation(fields: [identityId], references: [id], onDelete: Cascade)
  provider   String
  externalId String
  verified   Boolean  @default(false)
  createdAt  DateTime @default(now())

  @@unique([provider, externalId])
}

model LegalConsent {
  id          String   @id @default(uuid())
  identityId  String
  identity    Identity @relation(fields: [identityId], references: [id], onDelete: Cascade)
  tenantId    String?
  version     String
  consentedAt DateTime @default(now())
}

model Wallet {
  id         String   @id @default(uuid())
  identityId String
  identity   Identity @relation(fields: [identityId], references: [id], onDelete: Cascade)
  did        String   @unique
  keyRef     String?
  createdAt  DateTime @default(now())
}
`;

const SEED_SCRIPT = `// SovGrant seed (managed by sg). Run: pnpm tsx prisma/seed.sg.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const system = await prisma.tenant.upsert({
    where: { slug: "system" },
    update: {},
    create: { name: "System", slug: "system", plan: "ENTERPRISE" },
  });
  console.log("Seeded SYSTEM tenant:", system.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
`;

const DOCKER_COMPOSE = `# SovGrant backend (managed by sg). Run: docker compose -f docker-compose.sg.yml up -d
services:
  sg-postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: sg
      POSTGRES_PASSWORD: sg
      POSTGRES_DB: sg
    ports:
      - "5432:5432"
    volumes:
      - sg_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sg"]
      interval: 5s
      timeout: 5s
      retries: 10

  sg-redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  sg-api:
    image: ghcr.io/fusorb/sovgrant:latest
    env_file: .env.sg
    ports:
      - "4000:4000"
    depends_on:
      sg-postgres:
        condition: service_healthy
      sg-redis:
        condition: service_started

volumes:
  sg_pg_data:
`;

export const postgresAdapter: DbAdapter = {
  name: "PostgreSQL (recommended)",
  engine: "postgres",
  async detect(root) {
    return detectDb(root);
  },
  async generateSchema(_ctx) {
    const files: ScaffoldFile[] = [];
    files.push({ relativePath: "prisma/schema.sg.prisma", content: CANONICAL_SCHEMA });
    files.push({ relativePath: "prisma/seed.sg.ts", content: SEED_SCRIPT });
    files.push({ relativePath: "docker-compose.sg.yml", content: DOCKER_COMPOSE });
    return files;
  },
  envKeys() {
    return ["DATABASE_URL"];
  },
  async probe(ctx) {
    try {
      const pg = (await import("pg")) as any;
      const Client = pg.Client ?? pg.default?.Client;
      const client = new Client({ connectionString: ctx.detection.databaseUrl || process.env.DATABASE_URL });
      await client.connect();
      const r = await client.query("SELECT version()");
      await client.end();
      return { ok: true, version: r.rows?.[0]?.version };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  },
  migrationInstructions(_ctx) {
    return [
      "Review prisma/schema.sg.prisma and merge into prisma/schema.prisma (or use Prisma multi-file schema).",
      "Run: npx prisma migrate dev --name sg_init",
      "Run seed: pnpm tsx prisma/seed.sg.ts",
    ];
  },
};
