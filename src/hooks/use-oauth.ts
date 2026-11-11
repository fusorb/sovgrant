"use client";

import { useCallback } from "react";
import { oauth } from "@/sdk";
import type { CreateClientParams, UpdateClientParams } from "@fusorb/facet-sdk";
import { useApiGuard } from "./use-api-guard";

export function useOAuth() {
  const guard = useApiGuard();

  const listClients = useCallback(() => guard(() => oauth.listClients()), [
    guard,
  ]);

  const listTokens = useCallback(() => guard(() => oauth.listTokens()), [
    guard,
  ]);

  const createClient = useCallback(
    (data: CreateClientParams) => guard(() => oauth.createClient(data)),
    [guard],
  );

  const updateClient = useCallback(
    (clientId: string, data: UpdateClientParams) =>
      guard(() => oauth.updateClient(clientId, data)),
    [guard],
  );

  const deleteClient = useCallback(
    (clientId: string) => guard(() => oauth.deleteClient(clientId)),
    [guard],
  );

  const revokeToken = useCallback(
    (tokenId: string) => guard(() => oauth.revokeToken(tokenId)),
    [guard],
  );

  const listConsents = useCallback(() => guard(() => oauth.listConsents()), [
    guard,
  ]);

  const grantConsent = useCallback(
    (data: { clientId: string; scopes: string[] }) =>
      guard(() => oauth.grantConsent(data)),
    [guard],
  );

  const revokeConsent = useCallback(
    (clientId: string) => guard(() => oauth.revokeConsent(clientId)),
    [guard],
  );

  return {
    listClients,
    listTokens,
    createClient,
    updateClient,
    deleteClient,
    revokeToken,
    listConsents,
    grantConsent,
    revokeConsent,
  };
}
