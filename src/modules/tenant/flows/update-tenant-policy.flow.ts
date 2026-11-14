// src/modules/tenant/flows/update-tenant-policy.flow.ts
import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";

export const UpdateTenantPolicyInputSchema = z.object({
  tenantId: z.string().cuid(),
  data: z.object({
    requireMfa: z.boolean().optional(),
    requireLegalConsent: z.boolean().optional(),
    sessionTtlMinutes: z.number().int().min(5).max(10080).optional(),
    allowedEmailDomains: z.array(z.string()).optional(),
    maxSessionsPerUser: z.number().int().min(1).max(100).optional(),
    allowPasskeys: z.boolean().optional(),
  }),
});

export const UpdateTenantPolicyOutputSchema = z.unknown();

type Input = z.infer<typeof UpdateTenantPolicyInputSchema>;
type Output = z.infer<typeof UpdateTenantPolicyOutputSchema>;

export const updateTenantPolicyFlow: Flow<Input, Output> = {
  name: "tenant:update-policy",
  inputSchema: UpdateTenantPolicyInputSchema,
  outputSchema: UpdateTenantPolicyOutputSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    if (!ctx.identityId) throw ApiError.unauthorized();

    const policy = await ctx.db.tenantPolicy.upsert({
      where: { tenantId: input.tenantId },
      update: input.data,
      create: {
        tenantId: input.tenantId,
        ...input.data,
        loginMethods: (input.data as Record<string, any>).loginMethods ?? {},
      },
    });

    await ctx.db.auditLog.create({
      data: {
        actionId: "TENANT_POLICY_UPDATED",
        tenantId: input.tenantId,
        identityId: ctx.identityId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: input.data as any,
      },
    });

    return policy;
  },
};
