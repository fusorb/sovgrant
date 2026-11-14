"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@fusorb/facet-layout";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@fusorb/facet-components";
import { useTenant } from "@/hooks/use-tenant";
import type { Membership } from "@fusorb/facet-sdk";

export function MembersView() {
  const { activeTenant, listMembers } = useTenant();
  const [items, setItems] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!activeTenant?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listMembers(activeTenant.id);
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to load members.");
      setItems(((res as any)?.data ?? []) as Membership[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenant?.id]);

  if (!activeTenant) {
    return (
      <>
        <PageHeader title="Members" description="Who belongs to this workspace." />
        <main className="p-6"><EmptyState title="No active workspace" description="Select or create a tenant to view members." /></main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Members" description={`Members of ${activeTenant.name}.`} actions={<Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>} />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive"><AlertTitle>Could not load members</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        ) : null}
        <Card>
          <CardHeader><CardTitle>Workspace members</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : items.length === 0 ? (
              <EmptyState title="No members" description="Members of this workspace will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Member</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((m, idx) => (
                    <TableRow key={m.tenantId + (m as any).identityId + idx}>
                      <TableCell>
                        <div className="font-medium">{m.name || (m as any).identityId || m.tenantId}</div>
                        <div className="text-muted-foreground text-xs">{(m as any).email || (m as any).identityId || "—"}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{m.role || "—"}</Badge></TableCell>
                      <TableCell><Badge variant={m.status === "active" ? "success" : "secondary"}>{m.status || "active"}</Badge></TableCell>
                      <TableCell>{m.joinedAt ? new Date(m.joinedAt).toLocaleString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
