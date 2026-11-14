import { describe, it, expect, vi, beforeEach } from "vitest";
import { listIdentitiesAdminFlow } from "./list-identities-admin.flow";
import { createMockFlowCtx } from "@/test-utils/mock-db";

describe("listIdentitiesAdminFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists identities with paging and filters", async () => {
    const ctx = createMockFlowCtx({ identityId: "admin-1" });
    const identities = [{ id: "i1", primaryEmail: "a@b.c" }];
    ctx.db.identity.findMany.mockResolvedValue(identities);
    ctx.db.identity.count.mockResolvedValue(1);

    const result = await listIdentitiesAdminFlow.execute(
      { limit: 20, page: 2, status: "ACTIVE", search: "a@b" },
      ctx,
    );

    expect(result).toEqual({ identities, total: 1, page: 2, limit: 20 });
    const expectedWhere = {
      status: "ACTIVE",
      OR: [
        { primaryEmail: { contains: "a@b", mode: "insensitive" } },
        { name: { contains: "a@b", mode: "insensitive" } },
      ],
    };
    expect(ctx.db.identity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 20,
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(ctx.db.identity.count).toHaveBeenCalledWith({ where: expectedWhere });
  });
});
