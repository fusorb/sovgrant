import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { OnboardingService } from "../services/onboarding.service";
import { StartProgressSchema } from "../validators/onboarding.schemas";

export const startOnboardingProgressFlow: Flow<z.infer<typeof StartProgressSchema>> = {
  name: "tenant:start-onboarding-progress",
  inputSchema: StartProgressSchema,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const onboardingService = new OnboardingService(ctx.db);
    return onboardingService.startProgress(ctx.identityId, input.flowId);
  },
};
