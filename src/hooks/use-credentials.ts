"use client";

import { useCallback } from "react";
import { credentials } from "@/sdk";
import type { IssueCredentialParams } from "@fusorb/facet-sdk";
import { useApiGuard } from "./use-api-guard";

export function useCredentials() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => credentials.list()), [guard]);

  const verify = useCallback(
    (credential: string) => credentials.verify(credential),
    [],
  );

  const issue = useCallback(
    (data: IssueCredentialParams) => guard(() => credentials.issue(data)),
    [guard],
  );

  const offer = useCallback(
    (data: { credentialId: string; expiresAt?: string }) =>
      guard(() => credentials.offer(data)),
    [guard],
  );

  const acceptOffer = useCallback(
    (token: string) => guard(() => credentials.acceptOffer(token)),
    [guard],
  );

  const revoke = useCallback(
    (credentialId: string) => guard(() => credentials.revoke(credentialId)),
    [guard],
  );

  return { list, verify, issue, offer, acceptOffer, revoke };
}
