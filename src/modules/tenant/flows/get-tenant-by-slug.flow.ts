// src/modules/tenant/flows/get-tenant-by-slug.flow.ts
import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";
import { presentTenant } from "../presenters/tenant.presenter";

export const GetTenantBySlugInputSchema = z.object({
  slug: z.string().min(1),
});

export const GetTenantBySlugOutputSchema = z.unknown();

type Input = z.infer<typeof GetTenantBySlugInputSchema>;
type Output = z.infer<typeof GetTenantBySlugOutputSchema>;

export const getTenantBySlugFlow: Flow<Input, Output> = {
  name: "tenant:get-by-slug",
  inputSchema: GetTenantBySlugInputSchema,
  outputSchema: GetTenantBySlugOutputSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    if (!ctx.identityId) throw ApiError.unauthorized();

    const tenant = await ctx.db.tenant.findUnique({ where: { slug: input.slug } });
    if (!tenant) throw ApiError.notFound("Organisation not found");

    // Requester must be ACTIVE member of this tenant OR of SYSTEM (platform admin).
    // Return 404 (not 403) to avoid leaking tenant existence to non-members.
    const membership = await ctx.db.tenantMembership.findFirst({
      where: {
        identityId: ctx.identityId,
        tenantId: { in: [tenant.id, "SYSTEM"] },
        status: "ACTIVE",
      },
    });

    if (!membership) {
      throw ApiError.notFound("Organisation not found");
    }

    return presentTenant(tenant);
  },
};
