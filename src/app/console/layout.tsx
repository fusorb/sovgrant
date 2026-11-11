"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConsoleLayout } from "@fusorb/facet-layout";
import type { RouterAdapter, RouterLinkProps } from "@fusorb/facet-layout";
import { useAuthSession } from "@fusorb/facet-auth";
import { buildLayoutConfig } from "@/config/layout";
import { useTenant } from "@/hooks/use-tenant";

/**
 * Console shell - facet ConsoleLayout driven by @/config/nav + @/config/layout,
 * with Next-native routing and the tenant switcher bound to the tenant store.
 */
export default function ConsoleRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const session = useAuthSession();
  const { activeTenant, tenants, switchTenant } = useTenant();

  if (session.isLoading || !session.isAuthenticated) {
    return null;
  }

  const routerAdapter: RouterAdapter = {
    Link: ({ href, children: linkChildren, className }: RouterLinkProps) => (
      <Link href={href} className={className}>
        {linkChildren}
      </Link>
    ),
    isActive: (href: string) => {
      if (href === "/") return pathname === "/";
      return (
        pathname === href ||
        pathname.startsWith(href.endsWith("/") ? href : href + "/")
      );
    },
  };

  const tenantRefs = tenants.map((t) => ({
    id: t.id,
    name: t.name ?? t.slug ?? t.id,
    slug: t.slug,
    plan: t.plan,
  }));

  return (
    <ConsoleLayout
      config={buildLayoutConfig()}
      router={routerAdapter}
      session={session}
      tenants={tenantRefs}
      activeTenant={
        activeTenant
          ? {
              id: activeTenant.id,
              name: activeTenant.name ?? activeTenant.slug ?? activeTenant.id,
              slug: activeTenant.slug,
              plan: activeTenant.plan,
            }
          : null
      }
      onTenantSwitch={(id) => {
        void switchTenant(id);
      }}
      themeToggle
    >
      {children}
    </ConsoleLayout>
  );
}
