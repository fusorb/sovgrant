// src/modules/tenant/flows/get-tenant-jwks.flow.ts
import { z } from "zod";
import { exportJWK, importSPKI } from "jose";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";

export const GetTenantJwksInputSchema = z.object({
  slug: z.string().min(1),
});

export const GetTenantJwksOutputSchema = z.object({
  keys: z.array(z.record(z.string(), z.any())),
});

type Input = z.infer<typeof GetTenantJwksInputSchema>;
type Output = z.infer<typeof GetTenantJwksOutputSchema>;

export const getTenantJwksFlow: Flow<Input, Output> = {
  name: "tenant:get-jwks",
  inputSchema: GetTenantJwksInputSchema,
  outputSchema: GetTenantJwksOutputSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    const tenant = await ctx.db.tenant.findUnique({ where: { slug: input.slug } });
    if (!tenant) throw ApiError.notFound("NOT_FOUND");

    const keys = await ctx.db.tenantSigningKey.findMany({
      where: { tenantId: tenant.id, status: "ACTIVE" },
    });

    const jwks = await Promise.all(
      keys.map(async (key) => {
        try {
          const pem = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(key.publicKey).toString("base64")}\n-----END PUBLIC KEY-----`;
          const cryptoKey = await importSPKI(pem, key.algorithm);
          const jwk = await exportJWK(cryptoKey);
          return { ...jwk, kid: key.kid, alg: key.algorithm, use: "sig" } as Record<string, unknown>;
        } catch {
          return null;
        }
      }),
    );

    return { keys: jwks.filter((k): k is Record<string, unknown> => k !== null) };
  },
};
