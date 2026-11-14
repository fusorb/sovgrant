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
import { useSessions } from "@/hooks/use-sessions";

type Session = {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: string | null;
  lastActiveAt?: string | null;
  expiresAt?: string | null;
  current?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function SessionsView() {
  const { list, revoke } = useSessions();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await list();
      setSessions((res?.data ?? []) as Session[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRevoke(id: string) {
    setRevoking(id);
    try {
      await revoke(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke session.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Sessions"
        description="Active authenticated sessions."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load sessions</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Active sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState
                title="No active sessions"
                description="Sessions you sign in with will appear here."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">
                        <div className="truncate max-w-[220px]" title={s.id}>
                          {s.id}
                          {s.current ? " (current)" : ""}
                        </div>
                        {s.userAgent ? (
                          <div
                            className="text-muted-foreground truncate max-w-[260px]"
                            title={s.userAgent}
                          >
                            {s.userAgent}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{s.ip ?? "—"}</TableCell>
                      <TableCell>{formatDate(s.lastActiveAt ?? s.createdAt)}</TableCell>
                      <TableCell>{formatDate(s.expiresAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void onRevoke(s.id)}
                          disabled={revoking === s.id || s.current}
                        >
                          {revoking === s.id ? "Revoking…" : "Revoke"}
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
