import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { auditService } from "@/modules/audit/services/audit.service";
import { ProjectService } from "../services/project.service";
import { CreateProjectSchema } from "../validators/project.schemas";

const Input = CreateProjectSchema.extend({ tenantId: z.string().cuid() });

export const createProjectFlow: Flow<z.infer<typeof Input>> = {
  name: "tenant:create-project",
  inputSchema: Input,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const { tenantId, ...data } = input;

    const projectService = new ProjectService(ctx.db);
    const project = await projectService.create(tenantId, data);

    void auditService
      .log({
        action: "TENANT_UPDATED",
        identityId: ctx.identityId,
        tenantId,
        ip: ctx.ip,
        metadata: {
          event: "project_created",
          projectId: project.id,
          slug: project.slug,
        },
      })
      .catch(() => {});

    return project;
  },
};
