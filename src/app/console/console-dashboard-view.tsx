"use client";

import Link from "next/link";
import { PageHeader } from "@fusorb/facet-layout";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@fusorb/facet-components";
import { useTenant } from "@/hooks/use-tenant";

const sections = [
  { href: "/console/identities", title: "Identities", description: "People and entities" },
  { href: "/console/credentials", title: "Credentials", description: "Verifiable credentials" },
  { href: "/console/oauth/applications", title: "OAuth apps", description: "Clients and tokens" },
  { href: "/console/organization", title: "Organization", description: "Members, policy, keys, SSO" },
  { href: "/console/security/sessions", title: "Security", description: "Sessions, MFA, devices" },
  { href: "/console/api-keys", title: "API keys", description: "Machine credentials" },
  { href: "/console/webhooks", title: "Webhooks", description: "Event delivery" },
  { href: "/console/billing", title: "Billing", description: "Plan and subscription" },
];

export function ConsoleDashboardView() {
  const { activeTenant, tenants } = useTenant();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your workspace."
        actions={<Button asChild variant="outline"><Link href="/console/tenants">Switch workspace</Link></Button>}
      />
      <main className="p-6 space-y-4">
        {!activeTenant ? (
          <EmptyState
            title={tenants.length ? "Select a workspace" : "No workspaces yet"}
            description={tenants.length ? "Choose an active tenant to continue." : "Create a workspace to get started."}
            action={<Button asChild><Link href={tenants.length ? "/console/tenants" : "/console/tenants/new"}>{tenants.length ? "View workspaces" : "Create workspace"}</Link></Button>}
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{activeTenant.name}</CardTitle>
                <CardDescription>Active workspace · {activeTenant.slug}{activeTenant.role ? ` · ${activeTenant.role}` : ""}</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">Manage identities, credentials, access, and organization settings from the sections below.</CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sections.map((s) => (
                <Link key={s.href} href={s.href} className="block">
                  <Card className="h-full transition-colors hover:bg-muted/40">
                    <CardHeader>
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <CardDescription>{s.description}</CardDescription>
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
