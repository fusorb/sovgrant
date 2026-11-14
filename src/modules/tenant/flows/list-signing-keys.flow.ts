// src/modules/tenant/flows/list-signing-keys.flow.ts
import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";
import { TenantService } from "../services/tenant.service";

export const ListSigningKeysInputSchema = z.object({
  tenantId: z.string().cuid(),
});

export const ListSigningKeysOutputSchema = z.array(z.any());

type Input = z.infer<typeof ListSigningKeysInputSchema>;
type Output = z.infer<typeof ListSigningKeysOutputSchema>;

export const listSigningKeysFlow: Flow<Input, Output> = {
  name: "tenant:list-signing-keys",
  inputSchema: ListSigningKeysInputSchema,
  outputSchema: ListSigningKeysOutputSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    if (!ctx.identityId) throw ApiError.unauthorized();

    const tenantService = new TenantService(ctx.db);
    await tenantService.assertMembership(input.tenantId, ctx.identityId);

    const keys = await ctx.db.tenantSigningKey.findMany({
      where: { tenantId: input.tenantId, status: "ACTIVE" },
      select: {
        kid: true,
        algorithm: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        kmsProvider: true,
      },
    });

    return keys;
  },
};
