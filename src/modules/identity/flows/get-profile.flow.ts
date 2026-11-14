import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";

export const getProfileFlow: Flow<undefined, any> = {
  name: "identity:get-profile",
  inputSchema: z.undefined(),

  async execute(_input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();

    return ctx.db.identity.findUniqueOrThrow({
      where: { id: ctx.identityId },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { role: true },
        },
      },
    });
  },
};
