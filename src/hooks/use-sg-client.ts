"use client";

import { sgClient } from "@/sdk";

/**
 * Access to the shared SgClient singleton, kept behind a hook so
 * pages/components never import the SDK module directly (chain rule:
 * page -> component -> hook -> SDK -> API).
 */
export function useSgClient() {
  return sgClient;
}
