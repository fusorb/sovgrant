"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@fusorb/facet-layout";
import {
  Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@fusorb/facet-components";
import { useTenant } from "@/hooks/use-tenant";

export function TenantsView() {
  const { activeTenant, tenants, isLoading, hydrateTenants, switchTenant } = useTenant();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void hydrateTenants(); }, [hydrateTenants]);

  async function onSwitch(id: string) {
    setBusy(id); setError(null);
    try {
      const res = await switchTenant(id);
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to switch workspace.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to switch workspace.");
    } finally { setBusy(null); }
  }

  return (
    <>
      <PageHeader title="Tenants" description="Workspaces you belong to." actions={<Button asChild><Link href="/console/tenants/new">New workspace</Link></Button>} />
      <main className="p-6 space-y-4">
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Card>
          <CardHeader><CardTitle>Your workspaces</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div> : tenants.length === 0 ? (
              <EmptyState title="No workspaces" description="Create a workspace to get started." action={<Button asChild><Link href="/console/tenants/new">Create workspace</Link></Button>} />
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {tenants.map((t) => {
                    const active = activeTenant?.id === t.id;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="font-mono text-xs">{t.slug}</TableCell>
                        <TableCell><Badge variant="secondary">{t.role || "—"}</Badge></TableCell>
                        <TableCell>{active ? <Badge variant="success">active</Badge> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => void onSwitch(t.id)} disabled={active || busy !== null}>
                            {active ? "Current" : busy === t.id ? "Switching…" : "Switch"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
