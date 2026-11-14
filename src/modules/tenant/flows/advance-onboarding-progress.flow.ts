import { z } from "zod";
import type { Flow, FlowContext } from "@/core/flows";
import { ApiError } from "@/core/errors";
import { OnboardingService } from "../services/onboarding.service";
import { AdvanceProgressSchema } from "../validators/onboarding.schemas";

const Input = AdvanceProgressSchema.extend({
  progressId: z.string().cuid(),
});

export const advanceOnboardingProgressFlow: Flow<z.infer<typeof Input>> = {
  name: "tenant:advance-onboarding-progress",
  inputSchema: Input,

  async execute(input, ctx: FlowContext) {
    if (!ctx.identityId) throw ApiError.unauthorized();
    const { progressId, ...data } = input;
    const onboardingService = new OnboardingService(ctx.db);
    return onboardingService.advanceProgress(ctx.identityId, progressId, data);
  },
};
