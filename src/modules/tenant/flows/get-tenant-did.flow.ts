// src/modules/tenant/flows/get-tenant-did.flow.ts
import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";
import { TenantService } from "../services/tenant.service";

export const GetTenantDidInputSchema = z.object({
  tenantId: z.string().cuid(),
});

export const GetTenantDidOutputSchema = z.object({
  did: z.string(),
  document: z.unknown(),
});

type Input = z.infer<typeof GetTenantDidInputSchema>;
type Output = z.infer<typeof GetTenantDidOutputSchema>;

export const getTenantDidFlow: Flow<Input, Output> = {
  name: "tenant:get-did",
  inputSchema: GetTenantDidInputSchema,
  outputSchema: GetTenantDidOutputSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    if (!ctx.identityId) throw ApiError.unauthorized();

    const tenantService = new TenantService(ctx.db);
    await tenantService.assertMembership(input.tenantId, ctx.identityId);

    const did = await ctx.db.decentralizedIdentifier.findUnique({
      where: { tenantId: input.tenantId },
    });
    if (!did) {
      throw ApiError.notFound("No DID provisioned for this tenant");
    }

    return {
      did: did.id,
      document: did.didDocument,
    };
  },
};
