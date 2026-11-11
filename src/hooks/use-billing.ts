"use client";

import { useCallback, useEffect, useState } from "react";
import { billing } from "@/sdk";
import type { Subscription } from "@fusorb/facet-sdk";
import { useApiGuard } from "./use-api-guard";

export const PLAN_STATUS_VARIANT: Record<
  string,
  "default" | "success" | "warning" | "destructive"
> = {
  ACTIVE: "success",
  TRIAL: "default",
  PAST_DUE: "warning",
  CANCELED: "destructive",
};

export function useBilling() {
  const guard = useApiGuard();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await guard(() => billing.getSubscription());
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setSubscription(result.data);
    setError(null);
  }, [guard]);

  useEffect(() => {
    void load();
  }, [load]);

  return { subscription, error, load };
}
