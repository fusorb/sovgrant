"use client";

import { PageHeader } from "@fusorb/facet-layout";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ShineBorderCard,
} from "@fusorb/facet-components";
import { useTenantStore } from "@fusorb/facet-store";
import Link from "next/link";

export default function OrganizationPage() {
  const { activeTenant } = useTenantStore();

  return (
    <>
      <PageHeader
        title="Organization"
        description="Your organization and workspace settings."
      />
      <main className="p-6">
        <div className="grid gap-6 md:max-w-3xl">
          <ShineBorderCard>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>
                {activeTenant?.name ?? "No tenant selected"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/console/tenants"
                className="text-sm underline"
              >
                Switch tenant
              </Link>
            </CardContent>
          </ShineBorderCard>

          <ShineBorderCard>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Manage who has access to this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/console/organization/members"
                className="text-sm underline"
              >
                Manage members
              </Link>
            </CardContent>
          </ShineBorderCard>

        </div>
      </main>
    </>
  );
}
