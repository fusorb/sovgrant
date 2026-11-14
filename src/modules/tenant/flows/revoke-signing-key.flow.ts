// src/modules/tenant/flows/revoke-signing-key.flow.ts
import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";

export const RevokeSigningKeyInputSchema = z.object({
  tenantId: z.string().cuid(),
  kid: z.string().min(1),
});

export const RevokeSigningKeyOutputSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

type Input = z.infer<typeof RevokeSigningKeyInputSchema>;
type Output = z.infer<typeof RevokeSigningKeyOutputSchema>;

export const revokeSigningKeyFlow: Flow<Input, Output> = {
  name: "tenant:revoke-signing-key",
  inputSchema: RevokeSigningKeyInputSchema,
  outputSchema: RevokeSigningKeyOutputSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    if (!ctx.identityId) throw ApiError.unauthorized();

    const updateResult = await ctx.db.tenantSigningKey.updateMany({
      where: { tenantId: input.tenantId, kid: input.kid, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });

    if (updateResult.count === 0) {
      throw ApiError.notFound("Active signing key not found or already revoked");
    }

    await ctx.db.auditLog.create({
      data: {
        actionId: "SIGNING_KEY_REVOKED",
        tenantId: input.tenantId,
        identityId: ctx.identityId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { kid: input.kid },
      },
    });

    return { success: true, message: "Signing key revoked" };
  },
};
