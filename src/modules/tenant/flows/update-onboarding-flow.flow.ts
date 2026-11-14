import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { ProjectService } from "../services/project.service";
import { OnboardingService } from "../services/onboarding.service";
import { UpdateOnboardingFlowSchema } from "../validators/onboarding.schemas";

const Input = UpdateOnboardingFlowSchema.extend({
  tenantId: z.string().cuid(),
  projectId: z.string().cuid(),
  flowId: z.string().cuid(),
});

export const updateOnboardingFlowFlow: Flow<z.infer<typeof Input>> = {
  name: "tenant:update-onboarding-flow",
  inputSchema: Input,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const { tenantId, projectId, flowId, ...data } = input;

    const projectService = new ProjectService(ctx.db);
    await projectService.getById(tenantId, projectId);

    const onboardingService = new OnboardingService(ctx.db);
    return onboardingService.updateFlow(projectId, flowId, data);
  },
};
