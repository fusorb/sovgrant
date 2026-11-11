"use client";

import { useCallback } from "react";
import { webhooks } from "@/sdk";
import type {
  CreateWebhookParams,
  ListEventsParams,
  UpdateWebhookParams,
} from "@fusorb/facet-sdk";
import { useApiGuard } from "./use-api-guard";

export function useWebhooks() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => webhooks.list()), [guard]);

  const create = useCallback(
    (data: CreateWebhookParams) => guard(() => webhooks.create(data)),
    [guard],
  );

  const update = useCallback(
    (id: string, data: UpdateWebhookParams) =>
      guard(() => webhooks.update(id, data)),
    [guard],
  );

  const remove = useCallback(
    (id: string) => guard(() => webhooks.delete(id)),
    [guard],
  );

  const test = useCallback(
    (id: string) => guard(() => webhooks.test(id)),
    [guard],
  );

  const listEvents = useCallback(
    (params?: ListEventsParams) => guard(() => webhooks.listEvents(params)),
    [guard],
  );

  const retryEvent = useCallback(
    (id: string) => guard(() => webhooks.retryEvent(id)),
    [guard],
  );

  return { list, create, update, remove, test, listEvents, retryEvent };
}
