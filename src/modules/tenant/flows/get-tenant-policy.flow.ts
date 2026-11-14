// src/modules/tenant/flows/get-tenant-policy.flow.ts
import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";
import { TenantService } from "../services/tenant.service";

export const GetTenantPolicyInputSchema = z.object({
  tenantId: z.string().cuid(),
});

export const GetTenantPolicyOutputSchema = z.unknown();

type Input = z.infer<typeof GetTenantPolicyInputSchema>;
type Output = z.infer<typeof GetTenantPolicyOutputSchema>;

export const getTenantPolicyFlow: Flow<Input, Output> = {
  name: "tenant:get-policy",
  inputSchema: GetTenantPolicyInputSchema,
  outputSchema: GetTenantPolicyOutputSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    if (!ctx.identityId) throw ApiError.unauthorized();

    const tenantService = new TenantService(ctx.db);
    await tenantService.assertMembership(input.tenantId, ctx.identityId);

    const policy = await ctx.db.tenantPolicy.findFirst({
      where: { tenantId: input.tenantId },
    });

    return policy ?? null;
  },
};
