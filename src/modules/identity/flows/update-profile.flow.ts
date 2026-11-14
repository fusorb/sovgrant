import { z } from "zod";
import { Prisma } from "@prisma-client";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { auditService } from "@/modules/audit/services/audit.service";
import { UpdateProfileSchema } from "../validators/identity.schemas";

type Input = z.infer<typeof UpdateProfileSchema>;

export const updateProfileFlow: Flow<Input, any> = {
  name: "identity:update-profile",
  inputSchema: UpdateProfileSchema,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();

    const identity = await ctx.db.identity.update({
      where: { id: ctx.identityId },
      data: {
        name: input.name,
        picture: input.picture,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
      },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { role: true },
        },
      },
    });

    void auditService
      .log({
        action: "PROFILE_UPDATED",
        identityId: ctx.identityId,
        ip: ctx.ip,
        metadata: { fields: Object.keys(input) },
      })
      .catch(() => {});

    return identity;
  },
};

