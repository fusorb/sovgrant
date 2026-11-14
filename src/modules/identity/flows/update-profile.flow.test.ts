import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/audit/services/audit.service", () => ({
  auditService: { log: vi.fn().mockResolvedValue(undefined) },
}));

import { updateProfileFlow } from "./update-profile.flow";
import { createMockFlowCtx } from "@/test-utils/mock-db";
import { auditService } from "@/modules/audit/services/audit.service";

describe("updateProfileFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 401 when not authenticated", async () => {
    const ctx = createMockFlowCtx({ identityId: undefined });
    await expect(
      updateProfileFlow.execute({ name: "N" }, ctx),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("updates profile fields and audits PROFILE_UPDATED", async () => {
    const updated = { id: "id-1", name: "New", memberships: [] };
    const ctx = createMockFlowCtx({ identityId: "id-1", ip: "1.2.3.4" });
    ctx.db.identity.update.mockResolvedValue(updated);

    const result = await updateProfileFlow.execute(
      { name: "New", picture: "https://x/y.png" },
      ctx,
    );

    expect(result).toBe(updated);
    expect(ctx.db.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "id-1" },
        data: expect.objectContaining({ name: "New", picture: "https://x/y.png" }),
        include: {
          memberships: { where: { status: "ACTIVE" }, include: { role: true } },
        },
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PROFILE_UPDATED",
        identityId: "id-1",
        ip: "1.2.3.4",
        metadata: { fields: ["name", "picture"] },
      }),
    );
  });
});
