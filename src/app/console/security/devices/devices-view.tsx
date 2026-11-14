"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@fusorb/facet-layout";
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
import { useDevices } from "@/hooks/use-devices";

type Device = {
  id: string;
  name?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt?: string | null;
  lastSeenAt?: string | null;
  lastUsedAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function DevicesView() {
  const { list, remove } = useDevices();
  const [items, setItems] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await list();
      setItems(((res as any)?.data ?? []) as Device[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load devices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRemove(id: string) {
    setBusy(id);
    setError(null);
    try {
      await remove(id);
      setItems((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove device.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Devices"
        description="Devices known to your identity."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading || busy !== null}>
            Refresh
          </Button>
        }
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load devices</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Known devices</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState title="No devices" description="Devices you sign in from will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="font-medium">{d.name || d.id}</div>
                        {d.userAgent ? (
                          <div className="text-muted-foreground text-xs truncate max-w-[320px]" title={d.userAgent}>
                            {d.userAgent}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{d.ip ?? "—"}</TableCell>
                      <TableCell>{formatDate(d.lastSeenAt ?? d.lastUsedAt ?? d.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => void onRemove(d.id)} disabled={busy !== null}>
                          {busy === d.id ? "Removing…" : "Remove"}
                        </Button>
                      </TableCell>
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
