"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@fusorb/facet-store";
import { AuthLayout } from "@fusorb/facet-layout";
import { buildLayoutConfig } from "@/config/layout";

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { accessToken, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && accessToken) {
      router.replace("/console");
    }
  }, [accessToken, isLoading, router]);

  if (isLoading || accessToken) return null;

  return (
    <AuthLayout config={buildLayoutConfig()}>
      {children}
    </AuthLayout>
  );
}
