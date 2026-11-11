"use client";

import { useCallback } from "react";
import { identity, tenants } from "@/sdk";
import type { JsonObject } from "@fusorb/facet-sdk";
import { useApiGuard } from "./use-api-guard";

/**
 * useOnboarding - both halves of the onboarding domain:
 *   - authoring: the tenant's onboarding flows, scoped to a project
 *   - progress: an identity's own walk through a flow
 */
export function useOnboarding() {
  const guard = useApiGuard();

  const listFlows = useCallback(
    (tenantId: string, projectId: string) =>
      guard(() => tenants.listOnboardingFlows(tenantId, projectId)),
    [guard],
  );

  const getFlow = useCallback(
    (tenantId: string, projectId: string, flowId: string) =>
      guard(() => tenants.getOnboardingFlow(tenantId, projectId, flowId)),
    [guard],
  );

  const createFlow = useCallback(
    (
      tenantId: string,
      projectId: string,
      data: { name?: string; steps: Array<{ type: string; title?: string }> },
    ) => guard(() => tenants.createOnboardingFlow(tenantId, projectId, data)),
    [guard],
  );

  const updateFlow = useCallback(
    (
      tenantId: string,
      projectId: string,
      flowId: string,
      data: {
        name?: string;
        steps?: Array<{ type: string; title?: string }>;
      },
    ) =>
      guard(() =>
        tenants.updateOnboardingFlow(tenantId, projectId, flowId, data),
      ),
    [guard],
  );

  const deleteFlow = useCallback(
    (tenantId: string, projectId: string, flowId: string) =>
      guard(() => tenants.deleteOnboardingFlow(tenantId, projectId, flowId)),
    [guard],
  );

  const start = useCallback(
    (flowId: string) => guard(() => identity.startOnboarding(flowId)),
    [guard],
  );

  const getProgress = useCallback(
    (progressId: string) =>
      guard(() => identity.getOnboardingProgress(progressId)),
    [guard],
  );

  const advance = useCallback(
    (progressId: string, stepId: string, data?: JsonObject) =>
      guard(() => identity.advanceOnboarding(progressId, stepId, data)),
    [guard],
  );

  return {
    listFlows,
    getFlow,
    createFlow,
    updateFlow,
    deleteFlow,
    start,
    getProgress,
    advance,
  };
}
