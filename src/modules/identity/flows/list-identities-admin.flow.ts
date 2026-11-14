import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";

const Input = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED", "PENDING", "DELETED"]).optional(),
  search: z.string().optional(),
});

export const listIdentitiesAdminFlow: Flow<z.infer<typeof Input>, any> = {
  name: "identity:list-identities-admin",
  inputSchema: Input,

  async execute(input, ctx: FlowContext) {
    const { limit, page, status, search } = input;
    const where: any = {};
    if (status) where.status = status;
    if (search)
      where.OR = [
        { primaryEmail: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];

    const [identities, total] = await Promise.all([
      ctx.db.identity.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          primaryEmail: true,
          name: true,
          status: true,
          emailVerified: true,
          createdAt: true,
        },
      }),
      ctx.db.identity.count({ where }),
    ]);

    return { identities, total, page, limit };
  },
};
