"use client";

import { useCallback } from "react";
import { tenants } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

export function useProjects() {
  const guard = useApiGuard();

  const list = useCallback(
    (tenantId: string) => guard(() => tenants.listProjects(tenantId)),
    [guard],
  );

  const get = useCallback(
    (tenantId: string, projectId: string) =>
      guard(() => tenants.getProject(tenantId, projectId)),
    [guard],
  );

  const create = useCallback(
    (tenantId: string, data: { name: string; description?: string }) =>
      guard(() => tenants.createProject(tenantId, data)),
    [guard],
  );

  const update = useCallback(
    (
      tenantId: string,
      projectId: string,
      data: { name?: string; description?: string },
    ) => guard(() => tenants.updateProject(tenantId, projectId, data)),
    [guard],
  );

  const remove = useCallback(
    (tenantId: string, projectId: string) =>
      guard(() => tenants.deleteProject(tenantId, projectId)),
    [guard],
  );

  return { list, get, create, update, remove };
}
