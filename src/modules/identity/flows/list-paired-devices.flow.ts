import { z } from "zod";
import type { Flow } from "@/core/flows/flow";
import type { FlowContext } from "@/core/flows/flow-context";
import { ApiError } from "@/core/errors/api-error";

const ListPairedDevicesOutputSchema = z.array(
  z.object({
    id: z.string(),
    deviceId: z.string(),
    name: z.string().nullable(),
    platform: z.string().nullable(),
    trusted: z.boolean(),
    createdAt: z.date(),
    lastSeenAt: z.date(),
    revokedAt: z.date().nullable(),
  }),
);

export const listPairedDevicesFlow: Flow<void, z.infer<typeof ListPairedDevicesOutputSchema>> = {
  name: "identity:list-paired-devices",
  inputSchema: z.void(),
  outputSchema: ListPairedDevicesOutputSchema,
  async execute(_input, ctx: FlowContext) {
    const identityId = ctx.identityId;
    if (!identityId) throw ApiError.unauthorized("Authentication required");
    return ctx.db.pairedDevice.findMany({
      where: { identityId },
      select: { id: true, deviceId: true, name: true, platform: true, trusted: true, createdAt: true, lastSeenAt: true, revokedAt: true },
      orderBy: { createdAt: "desc" },
    });
  },
};
