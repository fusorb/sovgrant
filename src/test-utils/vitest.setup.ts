import { vi } from "vitest";

vi.stubEnv("NODE_ENV", "test");

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/sovgrant_test";
process.env.JWT_SECRET ??= "a".repeat(32);
process.env.COOKIE_SECRET ??= "b".repeat(32);
process.env.RESEND_API_KEY ??= "test-resend-key";
process.env.WEBHOOK_SIGNING_SECRET ??= "c".repeat(32);

// Force the HS256 path deterministically. resolvePemContent() selects RS256
// whenever PRIVATE_KEY_PEM + PUBLIC_KEY_PEM resolve to content, so a developer
// shell that exported these (e.g. after sourcing .env) flips token signing to
// RS256 and importPKCS8 can reject a PKCS#1 key - failing tests unrelated to
// their change. CI has no PEMs, so this pins local runs to the same HS256 path.
vi.stubEnv("PRIVATE_KEY_PEM", "");
vi.stubEnv("PUBLIC_KEY_PEM", "");
