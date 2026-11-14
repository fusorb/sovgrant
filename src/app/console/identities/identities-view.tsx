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
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@fusorb/facet-components";
import { useIdentities } from "@/hooks/use-identities";

type Identity = {
  id: string;
  email?: string | null;
  primaryEmail?: string | null;
  name?: string | null;
  status?: string | null;
  type?: string | null;
  createdAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function IdentitiesView() {
  const { list, suspend, reinstate } = useIdentities();
  const [items, setItems] = useState<Identity[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(q?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await list(q ? { search: q } : undefined);
      const data = (res as any)?.data;
      const rows = Array.isArray(data) ? data : (data?.items ?? data?.identities ?? []);
      setItems(rows as Identity[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load identities.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSuspend(id: string) {
    setBusy(id);
    setError(null);
    try {
      await suspend(id);
      await load(search || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to suspend identity.");
    } finally {
      setBusy(null);
    }
  }

  async function onReinstate(id: string) {
    setBusy(id);
    setError(null);
    try {
      await reinstate(id);
      await load(search || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reinstate identity.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Identities"
        description="People and entities in this tenant."
        actions={
          <Button variant="outline" onClick={() => void load(search || undefined)} disabled={loading || busy !== null}>
            Refresh
          </Button>
        }
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load identities</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Identities</CardTitle>
            </div>
            <form
              className="flex w-full max-w-sm gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void load(search || undefined);
              }}
            >
              <Input
                placeholder="Search identities…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button type="submit" variant="secondary" disabled={loading}>
                Search
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState title="No identities" description="Identities in this tenant will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => {
                    const status = (i.status || "active").toLowerCase();
                    const suspended = status === "suspended";
                    return (
                      <TableRow key={i.id}>
                        <TableCell>
                          <div className="font-medium">{i.name || i.email || i.primaryEmail || i.id}</div>
                          <div className="text-muted-foreground text-xs">
                            {i.email || i.primaryEmail || i.id}
                            {i.type ? ` · ${i.type}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={suspended ? "destructive" : status === "active" ? "success" : "secondary"}>
                            {i.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(i.createdAt)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {suspended ? (
                            <Button size="sm" variant="outline" onClick={() => void onReinstate(i.id)} disabled={busy !== null}>
                              {busy === i.id ? "Working…" : "Reinstate"}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => void onSuspend(i.id)} disabled={busy !== null}>
                              {busy === i.id ? "Working…" : "Suspend"}
                            </Button>
                          )}
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
