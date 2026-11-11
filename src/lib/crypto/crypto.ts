import { randomBytes, createHash, createPublicKey, verify as verifySignature } from "crypto";

/** Cryptographically random URL-safe string */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/** SHA-256 hex digest — use for non-secret hashing (e.g. email token lookup) */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time comparison to prevent timing attacks */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** DER prefix for an Ed25519 SubjectPublicKeyInfo (RFC 8410 §2). */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/**
 * Verify an Ed25519 proof-of-possession signature.
 *
 * @param publicKey  base64url-encoded raw 32-byte Ed25519 public key (the shape
 *                   stored on `PairedDevice.publicKey`).
 * @param message    the signed message — a device-approval challenge.
 * @param signature  base64url-encoded 64-byte Ed25519 signature.
 */
export function verifyEd25519Signature(
  publicKey: string,
  message: string,
  signature: string,
): boolean {
  try {
    const raw = Buffer.from(publicKey, "base64url");
    if (raw.length !== 32) return false;

    const signatureBytes = Buffer.from(signature, "base64url");
    if (signatureBytes.length !== 64) return false;

    const keyObject = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, raw]),
      format: "der",
      type: "spki",
    });

    return verifySignature(null, Buffer.from(message, "utf8"), keyObject, signatureBytes);
  } catch {
    return false;
  }
}
