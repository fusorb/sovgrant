"use client";

import { useCallback } from "react";
import { auth } from "@/sdk";
import { useApiGuard } from "./use-api-guard";

export function useSessions() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => auth.listSessions()), [guard]);

  const revoke = useCallback(
    (sessionId: string) => guard(() => auth.revokeSession(sessionId)),
    [guard],
  );

  return { list, revoke };
}
