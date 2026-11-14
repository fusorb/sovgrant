import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { ProjectService } from "../services/project.service";
import { ListProjectsQuerySchema } from "../validators/project.schemas";

const Input = ListProjectsQuerySchema.extend({ tenantId: z.string().cuid() });

export const listProjectsFlow: Flow<z.infer<typeof Input>> = {
  name: "tenant:list-projects",
  inputSchema: Input,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const { tenantId, category } = input;

    const projectService = new ProjectService(ctx.db);
    await projectService.assertMembership(tenantId, ctx.identityId);

    return projectService.list(tenantId, category);
  },
};
