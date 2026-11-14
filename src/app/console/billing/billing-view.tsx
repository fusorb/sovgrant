"use client";

import { PageHeader } from "@fusorb/facet-layout";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@fusorb/facet-components";
import { useBilling, PLAN_STATUS_VARIANT } from "@/hooks/use-billing";

export function BillingView() {
  const { subscription, error, load } = useBilling();

  return (
    <>
      <PageHeader
        title="Billing"
        description="Subscription and plan for this tenant."
        actions={<Button variant="outline" onClick={() => void load()}>Refresh</Button>}
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load billing</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Current subscription</CardTitle>
            <CardDescription>Plan and status for the active tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            {!subscription && !error ? (
              <div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-6 w-24" /></div>
            ) : subscription ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">Plan</span>
                  <span className="font-medium">{subscription.plan}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">Status</span>
                  <Badge variant={PLAN_STATUS_VARIANT[subscription.status] ?? "secondary"}>
                    {subscription.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-xs">Tenant: {subscription.tenantId}</div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No subscription information available.</div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
