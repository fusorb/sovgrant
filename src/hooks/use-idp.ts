"use client";

import { useCallback } from "react";
import { idp } from "@/sdk";
import type { CreateConnectionParams } from "@fusorb/facet-sdk";
import { useApiGuard } from "./use-api-guard";

/** Enterprise SSO connections (SAML2 / OIDC) for the tenant. */
export function useIdp() {
  const guard = useApiGuard();

  const list = useCallback(() => guard(() => idp.listConnections()), [guard]);

  const get = useCallback(
    (id: string) => guard(() => idp.getConnection(id)),
    [guard],
  );

  const create = useCallback(
    (data: CreateConnectionParams) => guard(() => idp.createConnection(data)),
    [guard],
  );

  const update = useCallback(
    (id: string, data: Partial<CreateConnectionParams>) =>
      guard(() => idp.updateConnection(id, data)),
    [guard],
  );

  const remove = useCallback(
    (id: string) => guard(() => idp.deleteConnection(id)),
    [guard],
  );

  return { list, get, create, update, remove };
}
