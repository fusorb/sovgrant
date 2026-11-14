// src/modules/tenant/flows/list-tenants.flow.ts
import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";

export const ListTenantsInputSchema = z.object({});

export const ListTenantsOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    sector: z.string().nullable(),
    plan: z.string(),
    role: z.string(),
    createdAt: z.string(),
  }),
);

type Input = z.infer<typeof ListTenantsInputSchema>;
type Output = z.infer<typeof ListTenantsOutputSchema>;

export const listTenantsFlow: Flow<Input, Output> = {
  name: "tenant:list",
  inputSchema: ListTenantsInputSchema,
  outputSchema: ListTenantsOutputSchema,

  async execute(_input, ctx: FlowContext): Promise<Output> {
    if (!ctx.identityId) throw ApiError.unauthorized();

    const memberships = await ctx.db.tenantMembership.findMany({
      where: { identityId: ctx.identityId, status: "ACTIVE" },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            sector: true,
            createdAt: true,
            subscription: { select: { plan: true } },
          },
        },
        role: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      sector: m.tenant.sector,
      plan: m.tenant.subscription?.plan ?? "FREE",
      role: m.role.name,
      createdAt: m.tenant.createdAt.toISOString(),
    }));
  },
};
