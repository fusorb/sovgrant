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
import { usePairedDevices } from "@/hooks/use-paired-devices";

type PairedDevice = {
  id?: string;
  deviceId?: string;
  name?: string | null;
  label?: string | null;
  platform?: string | null;
  createdAt?: string | null;
  pairedAt?: string | null;
  lastSeenAt?: string | null;
  revoked?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function PairedDevicesView() {
  const { list, revoke } = usePairedDevices();
  const [items, setItems] = useState<PairedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await list();
      setItems(((res as any)?.data ?? []) as PairedDevice[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load paired devices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRevoke(key: string) {
    setBusy(key);
    setError(null);
    try {
      await revoke(key);
      setItems((prev) => prev.filter((d) => (d.deviceId ?? d.id) !== key));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke paired device.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Paired devices"
        description="Companion devices paired for approvals and step-up flows."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading || busy !== null}>
            Refresh
          </Button>
        }
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load paired devices</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Paired devices</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState title="No paired devices" description="Paired companion devices will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Paired</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((d) => {
                    const key = d.deviceId ?? d.id ?? "";
                    return (
                      <TableRow key={key || `${d.name}-${d.createdAt}`}>
                        <TableCell className="font-medium">{d.name || d.label || key || "—"}</TableCell>
                        <TableCell>{d.platform ?? "—"}</TableCell>
                        <TableCell>{formatDate(d.pairedAt ?? d.createdAt)}</TableCell>
                        <TableCell>{formatDate(d.lastSeenAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void onRevoke(key)}
                            disabled={busy !== null || !key || d.revoked}
                          >
                            {busy === key ? "Revoking…" : d.revoked ? "Revoked" : "Revoke"}
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
