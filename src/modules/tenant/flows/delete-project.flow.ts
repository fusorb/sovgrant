import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { auditService } from "@/modules/audit/services/audit.service";
import { ProjectService } from "../services/project.service";
import { ProjectParamsSchema } from "../validators/project.schemas";

export const deleteProjectFlow: Flow<z.infer<typeof ProjectParamsSchema>, { success: true }> = {
  name: "tenant:delete-project",
  inputSchema: ProjectParamsSchema,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const { tenantId, projectId } = input;

    const projectService = new ProjectService(ctx.db);
    await projectService.delete(tenantId, projectId);

    void auditService
      .log({
        action: "TENANT_UPDATED",
        identityId: ctx.identityId,
        tenantId,
        ip: ctx.ip,
        metadata: { event: "project_deleted", projectId },
      })
      .catch(() => {});

    return { success: true as const };
  },
};
