// src/modules/tenant/flows/create-signing-key.flow.ts
import { z } from "zod";
import { generateKeyPair, exportSPKI, exportPKCS8 } from "jose";
import { randomUUID } from "crypto";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";

export const CreateSigningKeyInputSchema = z.object({
  tenantId: z.string().cuid(),
});

export const CreateSigningKeyOutputSchema = z.object({
  kid: z.string(),
  algorithm: z.string(),
  publicKey: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

type Input = z.infer<typeof CreateSigningKeyInputSchema>;
type Output = z.infer<typeof CreateSigningKeyOutputSchema>;

export const createSigningKeyFlow: Flow<Input, Output> = {
  name: "tenant:create-signing-key",
  inputSchema: CreateSigningKeyInputSchema,
  outputSchema: CreateSigningKeyOutputSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    if (!ctx.identityId) throw ApiError.unauthorized();

    const algorithm = "ES256";
    const { publicKey, privateKey } = await generateKeyPair(algorithm);

    const publicKeySpki = await exportSPKI(publicKey);
    const privateKeyPkcs8 = await exportPKCS8(privateKey);
    const kid = randomUUID();

    const cleanPublicBase64 = publicKeySpki
      .replace(/-----BEGIN [^-]+-----|-----END [^-]+-----/g, "")
      .replace(/[\r\n\s]/g, "");

    const cleanPrivateBase64 = privateKeyPkcs8
      .replace(/-----BEGIN [^-]+-----|-----END [^-]+-----/g, "")
      .replace(/[\r\n\s]/g, "");

    const signingKey = await ctx.db.tenantSigningKey.create({
      data: {
        tenantId: input.tenantId,
        kid,
        algorithm,
        publicKey: Buffer.from(cleanPublicBase64, "base64"),
        privateKey: Buffer.from(cleanPrivateBase64, "base64"),
        status: "ACTIVE",
      },
    });

    await ctx.db.auditLog.create({
      data: {
        actionId: "SIGNING_KEY_CREATED",
        tenantId: input.tenantId,
        identityId: ctx.identityId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { kid, algorithm },
      },
    });

    return {
      kid: signingKey.kid,
      algorithm: signingKey.algorithm,
      publicKey: publicKeySpki,
      status: signingKey.status,
      createdAt: signingKey.createdAt.toISOString(),
    };
  },
};
