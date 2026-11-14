"use client";

import Link from "next/link";
import { PageHeader } from "@fusorb/facet-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@fusorb/facet-components";
import { useTenant } from "@/hooks/use-tenant";

const links = [
  { href: "/console/organization/members", title: "Members", description: "People in this workspace" },
  { href: "/console/organization/policies", title: "Policies", description: "Security and enforcement settings" },
  { href: "/console/organization/projects", title: "Projects", description: "Group resources by project" },
  { href: "/console/organization/signing-keys", title: "Signing keys", description: "Keys for DIDs and credentials" },
  { href: "/console/organization/sso", title: "SSO", description: "Enterprise identity providers" },
  { href: "/console/organization/did", title: "DID", description: "Tenant did:web identity" },
];

export function OrganizationView() {
  const { activeTenant } = useTenant();

  return (
    <>
      <PageHeader title="Organization" description="Workspace overview and settings." />
      <main className="p-6 space-y-4">
        {!activeTenant ? (
          <EmptyState title="No active workspace" description="Select or create a tenant to manage organization settings." />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{activeTenant.name}</CardTitle>
                <CardDescription>{activeTenant.slug} · {activeTenant.role || "member"}{activeTenant.plan ? ` · ${activeTenant.plan}` : ""}</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">Tenant ID: <span className="font-mono">{activeTenant.id}</span></CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="block">
                  <Card className="h-full transition-colors hover:bg-muted/40">
                    <CardHeader>
                      <CardTitle className="text-base">{l.title}</CardTitle>
                      <CardDescription>{l.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
