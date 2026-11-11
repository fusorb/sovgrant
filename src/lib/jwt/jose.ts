import { readFileSync } from "fs";
import { resolve } from "path";
import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
  type JWTPayload,
} from "jose";
import { ApiError } from "@/core/errors";

// Helper to resolve key content
function getFileContent(keyOrPath: string): string {
  // If it already looks like a PEM string, return it
  if (keyOrPath.includes("-----BEGIN")) return keyOrPath;
  // Otherwise, treat it as a file path and read it
  try {
    return readFileSync(resolve(process.cwd(), keyOrPath), "utf-8");
  } catch (e) {
    throw ApiError.internal(`Failed to load key from path: ${keyOrPath}`);
  }
}

/**
 * Signs a JWT using RS256 (Asymmetric) or HS256 (Symmetric).
 */
export async function signJwt(
  payload: Record<string, unknown>,
  options: {
    secret?: string;
    privateKeyOrSecret?: string;
    expiresIn: string;
    issuer?: string;
    alg?: "RS256" | "HS256";
    /**
     * Key id advertised in the JWT header. Set for RS256 so a relying party can
     * select the right key from the JWKS endpoint - it has no other way to know
     * which published key signed this token. Omit for HS256: there is no JWKS.
     */
    kid?: string;
  },
): Promise<string> {
  const alg = options.alg ?? "RS256";
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg, ...(options.kid ? { kid: options.kid } : {}) })
    .setIssuedAt()
    .setIssuer(options.issuer ?? "sovgrant")
    .setExpirationTime(options.expiresIn);

  if (alg === "HS256") {
    const secretKey = options.secret ?? options.privateKeyOrSecret;
    if (!secretKey) throw ApiError.internal("Missing HS256 secret");
    return jwt.sign(new TextEncoder().encode(secretKey));
  } else {
    // RS256 path
    const keySource = options.privateKeyOrSecret;
    if (!keySource)
      throw ApiError.internal("RS256 signing requires a private key/path");

    const pemContent = getFileContent(keySource);
    const privateKey = await importPKCS8(pemContent, "RS256");
    return jwt.sign(privateKey);
  }
}

/**
 * Verifies a JWT using RS256 or HS256.
 */
export async function verifyJwt<T extends JWTPayload>(
  token: string,
  keyOrSecret: string,
  options?: { issuer?: string; audience?: string; alg?: "RS256" | "HS256" },
): Promise<T> {
  const alg = options?.alg ?? "RS256";

  if (alg === "HS256") {
    const secret = new TextEncoder().encode(keyOrSecret);
    const { payload } = await jwtVerify(token, secret, {
      issuer: options?.issuer ?? "sovgrant",
      audience: options?.audience,
    });
    return payload as T;
  } else {
    // RS256: Load PEM string
    const publicKey = await importSPKI(keyOrSecret, "RS256");
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: options?.issuer ?? "sovgrant",
      audience: options?.audience,
    });
    return payload as T;
  }
}
