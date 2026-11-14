import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { auditService } from "@/modules/audit/services/audit.service";
import { ProjectService } from "../services/project.service";
import { ProjectParamsSchema, UpdateProjectSchema } from "../validators/project.schemas";

const Input = ProjectParamsSchema.merge(UpdateProjectSchema);

export const updateProjectFlow: Flow<z.infer<typeof Input>> = {
  name: "tenant:update-project",
  inputSchema: Input,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const { tenantId, projectId, ...data } = input;

    const projectService = new ProjectService(ctx.db);
    const project = await projectService.update(tenantId, projectId, data);

    void auditService
      .log({
        action: "TENANT_UPDATED",
        identityId: ctx.identityId,
        tenantId,
        ip: ctx.ip,
        metadata: { event: "project_updated", projectId },
      })
      .catch(() => {});

    return project;
  },
};
