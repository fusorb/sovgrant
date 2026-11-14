import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { OnboardingService } from "../services/onboarding.service";
import { ProgressParamsSchema } from "../validators/onboarding.schemas";

export const getOnboardingProgressFlow: Flow<z.infer<typeof ProgressParamsSchema>> = {
  name: "tenant:get-onboarding-progress",
  inputSchema: ProgressParamsSchema,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const onboardingService = new OnboardingService(ctx.db);
    return onboardingService.getProgress(ctx.identityId, input.progressId);
  },
};
