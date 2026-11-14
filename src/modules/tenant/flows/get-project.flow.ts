import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { ProjectService } from "../services/project.service";
import { ProjectParamsSchema } from "../validators/project.schemas";

export const getProjectFlow: Flow<z.infer<typeof ProjectParamsSchema>> = {
  name: "tenant:get-project",
  inputSchema: ProjectParamsSchema,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const { tenantId, projectId } = input;

    const projectService = new ProjectService(ctx.db);
    await projectService.assertMembership(tenantId, ctx.identityId);

    return projectService.getById(tenantId, projectId);
  },
};
