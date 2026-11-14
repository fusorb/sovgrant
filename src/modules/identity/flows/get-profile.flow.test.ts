import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProfileFlow } from "./get-profile.flow";
import { createMockFlowCtx } from "@/test-utils/mock-db";
import { ApiError } from "@/core/errors";

describe("getProfileFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 401 when not authenticated", async () => {
    const ctx = createMockFlowCtx({ identityId: undefined });
    await expect(getProfileFlow.execute(undefined, ctx)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("returns the identity with active memberships", async () => {
    const identity = {
      id: "id-1",
      primaryEmail: "a@example.com",
      memberships: [{ tenantId: "t1", status: "ACTIVE", role: { name: "ADMIN" } }],
    };
    const ctx = createMockFlowCtx({ identityId: "id-1" });
    ctx.db.identity.findUniqueOrThrow.mockResolvedValue(identity);

    const result = await getProfileFlow.execute(undefined, ctx);

    expect(result).toBe(identity);
    expect(ctx.db.identity.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "id-1" },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { role: true },
        },
      },
    });
  });
});
