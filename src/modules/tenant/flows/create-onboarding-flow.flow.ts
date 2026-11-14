import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { auditService } from "@/modules/audit/services/audit.service";
import { ProjectService } from "../services/project.service";
import { OnboardingService } from "../services/onboarding.service";
import { CreateOnboardingFlowSchema } from "../validators/onboarding.schemas";

const Input = CreateOnboardingFlowSchema.extend({
  tenantId: z.string().cuid(),
  projectId: z.string().cuid(),
});

export const createOnboardingFlowFlow: Flow<z.infer<typeof Input>> = {
  name: "tenant:create-onboarding-flow",
  inputSchema: Input,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const { tenantId, projectId, ...data } = input;

    const projectService = new ProjectService(ctx.db);
    await projectService.getById(tenantId, projectId);

    const onboardingService = new OnboardingService(ctx.db);
    const flow = await onboardingService.createFlow(projectId, data);

    void auditService
      .log({
        action: "TENANT_UPDATED",
        identityId: ctx.identityId,
        tenantId,
        ip: ctx.ip,
        metadata: {
          event: "onboarding_flow_created",
          projectId,
          flowId: flow.id,
        },
      })
      .catch(() => {});

    return flow;
  },
};
