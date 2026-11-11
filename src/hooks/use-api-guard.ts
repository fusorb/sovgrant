"use client";

import { useCallback } from "react";
import { useAuthStore } from "@fusorb/facet-store";
import type { ApiResponse } from "@fusorb/facet-sdk";

/**
 * Synthetic 401 returned by a guarded hook when there is no session token, so
 * callers have the same error contract whether the API or the guard rejected
 * the call.
 */
export function noSession<T = never>(): ApiResponse<T> {
  return {
    data: null,
    error: {
      statusCode: 401,
      error: "Unauthorized",
      message: "No access token",
    },
  };
}

/**
 * useApiGuard - wraps a backend call so it is only issued when a session token
 * is present. Centralises the "no token -> 401" contract that every domain hook
 * needs, instead of repeating the guard in each method.
 *
 * Calls made during session bootstrap (see providers/session-bootstrap.tsx)
 * deliberately bypass this guard: the first unauthenticated request is what
 * triggers the SDK's 401 refresh, after which a token exists.
 */
export function useApiGuard() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useCallback(
    <T>(call: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> =>
      accessToken ? call() : Promise.resolve(noSession<T>()),
    [accessToken],
  );
}
