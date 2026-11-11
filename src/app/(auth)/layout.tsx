"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@fusorb/facet-layout";
import { useAuthStore } from "@fusorb/facet-store";
import { buildLayoutConfig } from "@/config/layout";

/**
 * Auth page shell. Authenticated users never see these surfaces - they are
 * bounced to the console.
 */
export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/console");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) return null;

  return <AuthLayout config={buildLayoutConfig()}>{children}</AuthLayout>;
}
