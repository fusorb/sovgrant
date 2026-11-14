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
import { useAuditLog } from "@/hooks/use-audit-log";

type AuditEvent = {
  id: string;
  action?: string | null;
  actorId?: string | null;
  target?: string | null;
  ip?: string | null;
  createdAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function AuditView() {
  const { list } = useAuditLog();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await list({ limit: 50 } as any);
      const data = (res as any)?.data;
      setEvents(Array.isArray(data) ? (data as AuditEvent[]) : ((data?.items ?? []) as AuditEvent[]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Security and access events for your account and workspace."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load audit log</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Recent events</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                title="No events yet"
                description="Security and access events will appear here."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{formatDate(e.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.action ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        <span className="truncate block max-w-[160px]" title={e.actorId ?? ""}>
                          {e.actorId ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <span className="truncate block max-w-[160px]" title={e.target ?? ""}>
                          {e.target ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>{e.ip ?? "—"}</TableCell>
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
