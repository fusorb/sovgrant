"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@fusorb/facet-store";

/**
 * Root entry: route by auth state (never by URL convention).
 *   authenticated -> /console   (tenant-scoped console)
 *   anonymous     -> /home      (public landing)
 */
export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? "/console" : "/home");
  }, [isAuthenticated, isLoading, router]);

  return null;
}
