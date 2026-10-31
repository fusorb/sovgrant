import type { DbAdapter, DbEngine } from "./base.js";
import { postgresAdapter } from "./postgres.js";
import { cockroachAdapter } from "./cockroach.js";

export const ADAPTERS: Record<string, DbAdapter> = {
  postgres: postgresAdapter,
  cockroach: cockroachAdapter,
};

export function getAdapter(engine: string): DbAdapter | undefined {
  return ADAPTERS[engine];
}

export function listAdapters(): DbAdapter[] {
  return Object.values(ADAPTERS);
}

export type { DbAdapter };
export * from "./base.js";
