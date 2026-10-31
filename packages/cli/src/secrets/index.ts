import crypto from "node:crypto";

export function genJwtSecret(): string {
  return crypto.randomBytes(48).toString("base64");
}

export function genCookieSecret(): string {
  return crypto.randomBytes(48).toString("base64");
}

export function genWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function genLocalKmsKey(): string {
  return crypto.randomBytes(32).toString("base64");
}

export const SECRET_BLOCK_START = "# === SovGrant generated secrets (do not commit) ===";
export const SECRET_BLOCK_END = "# === end SovGrant generated secrets ===";

export interface SecretSet {
  JWT_SECRET?: string;
  COOKIE_SECRET?: string;
  WEBHOOK_SIGNING_SECRET?: string;
  LOCAL_KMS_KEY?: string;
}

/**
 * Merge generated secrets into an env file content string, preserving everything
 * outside the delimited block. Existing keys inside the block are kept unless
 * `overwrite` is true.
 */
export function mergeSecretBlock(
  original: string,
  secrets: SecretSet,
  overwrite = false,
): string {
  const lines = original.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => l.trim() === SECRET_BLOCK_START);
  const endIdx = lines.findIndex((l) => l.trim() === SECRET_BLOCK_END);

  const blockLines: string[] = [SECRET_BLOCK_START];
  for (const [k, v] of Object.entries(secrets)) {
    if (v) blockLines.push(`${k}=${v}`);
  }
  blockLines.push(SECRET_BLOCK_END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // replace block
    const before = lines.slice(0, startIdx);
    const after = lines.slice(endIdx + 1);
    // preserve consumer-set keys inside old block unless overwrite
    const oldBlock = lines.slice(startIdx + 1, endIdx);
    const oldMap: Record<string, string> = {};
    for (const l of oldBlock) {
      const idx = l.indexOf("=");
      if (idx > 0) oldMap[l.slice(0, idx).trim()] = l.slice(idx + 1);
    }
    const finalBlock = [SECRET_BLOCK_START];
    for (const [k, v] of Object.entries(secrets)) {
      if (!v) continue;
      if (!overwrite && oldMap[k]) finalBlock.push(`${k}=${oldMap[k]}`);
      else finalBlock.push(`${k}=${v}`);
    }
    finalBlock.push(SECRET_BLOCK_END);
    return [...before, ...finalBlock, ...after].join("\n");
  }

  // append block
  const sep = original.trim() === "" ? "" : "\n";
  return original.trimEnd() + sep + "\n" + blockLines.join("\n") + "\n";
}
