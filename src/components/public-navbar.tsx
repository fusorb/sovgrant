"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Navbar, Button, UserAvatar } from "@fusorb/facet-components";
import { useAuthStore } from "@fusorb/facet-store";
import type { RouterAdapter, RouterLinkProps } from "@fusorb/facet-layout";
import { useAuth } from "@/hooks/use-auth";

export const navLinks = [
  { label: "Features", href: "/home#features" },
  { label: "Console", href: "/console" },
  { label: "Pricing", href: "/pricing" },
];

export function PublicNavbar() {
  const { user } = useAuthStore();
  const { clearSession } = useAuth();
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

  const nextRouterAdapter: RouterAdapter = {
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
      variant="pill"
      brand={
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <img src="/sg-bw.png" alt="SovGrant" className="h-7 w-auto dark:invert" />
          <span>SovGrant</span>
        </Link>
      }
      showThemeToggle
      links={navLinks}
      router={nextRouterAdapter}
      actions={
        navUser ? (
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
            onSignOut={() => {
              clearSession();
              router.push("/login");
            }}
          />
        ) : (
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
        )
      }
    />
  );
}
