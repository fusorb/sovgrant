import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { ProjectService } from "../services/project.service";
import { OnboardingService } from "../services/onboarding.service";

const Input = z.object({
  tenantId: z.string().cuid(),
  projectId: z.string().cuid(),
  flowId: z.string().cuid(),
});

export const getOnboardingFlowFlow: Flow<z.infer<typeof Input>> = {
  name: "tenant:get-onboarding-flow",
  inputSchema: Input,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const { tenantId, projectId, flowId } = input;

    const projectService = new ProjectService(ctx.db);
    await projectService.assertMembership(tenantId, ctx.identityId);
    await projectService.getById(tenantId, projectId);

    const onboardingService = new OnboardingService(ctx.db);
    return onboardingService.getFlow(projectId, flowId);
  },
};
