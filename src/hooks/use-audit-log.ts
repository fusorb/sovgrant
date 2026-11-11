"use client";

import { useCallback } from "react";
import { audit } from "@/sdk";
import type { AuditListParams } from "@fusorb/facet-sdk";
import { useApiGuard } from "./use-api-guard";

export function useAuditLog() {
  const guard = useApiGuard();

  const list = useCallback(
    (params?: AuditListParams) => guard(() => audit.list(params)),
    [guard],
  );

  return { list };
}
