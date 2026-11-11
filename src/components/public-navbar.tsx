"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Navbar, UserAvatar } from "@fusorb/facet-components";
import { useAuth } from "@fusorb/facet-auth";
import type { RouterAdapter, RouterLinkProps } from "@fusorb/facet-layout";
import { SgMetadata } from "@/config/brand";

export const navLinks = [
  { label: "Features", href: "/home#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

/**
 * Public (marketing) navbar - pill-style glass variant, text-only brand
 * identity, theme toggle, and an authenticated UserAvatar once signed in.
 */
export function PublicNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const navUser = user
    ? {
        name: user.name ?? null,
        email: user.email ?? null,
        picture: user.picture ?? null,
        memberships:
          user.memberships?.map((m) => ({
            tenantId: m.tenantId,
            name: m.name ?? null,
            role: m.role,
          })) ?? [],
      }
    : undefined;

  const routerAdapter: RouterAdapter = {
    Link: ({ href, children, ...props }: RouterLinkProps) => (
      <Link href={href} {...props}>
        {children}
      </Link>
    ),
    isActive: (href: string) => {
      const route = href.split("#")[0];
      if (route === "/") return pathname === "/";
      return (
        pathname === route ||
        pathname.startsWith(route.endsWith("/") ? route : route + "/")
      );
    },
  };

  return (
    <Navbar
      variant="glass"
      brand={
        <Link
          href="/home"
          className="font-display text-xl font-semibold tracking-tight"
        >
          {SgMetadata.name}
        </Link>
      }
      showThemeToggle
      links={navLinks}
      router={routerAdapter}
      actions={
        navUser && isAuthenticated ? (
          <UserAvatar
            user={navUser}
            className="hidden md:block"
            items={[
              {
                label: "Console",
                icon: "layout-dashboard",
                onSelect: () => router.push("/console"),
              },
            ]}
            settingsHref="/console/user"
            onSignOut={async () => {
              await logout();
              router.push("/login");
            }}
          />
        ) : (
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
        )
      }
    />
  );
}
