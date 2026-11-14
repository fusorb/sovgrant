"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { useCredentials } from "@/hooks/use-credentials";

type Credential = {
  id: string;
  type?: string | null;
  format?: string | null;
  issuer?: string | null;
  subjectDid?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function CredentialsView() {
  const { list, revoke } = useCredentials();
  const [items, setItems] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await list();
      setItems(((res as any)?.data ?? []) as Credential[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load credentials.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRevoke(id: string) {
    setBusy(id);
    setError(null);
    try {
      await revoke(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke credential.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Credentials"
        description="Verifiable credentials you hold and issue."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading || busy !== null}>
              Refresh
            </Button>
            <Button asChild>
              <Link href="/console/credentials/create">Issue credential</Link>
            </Button>
          </div>
        }
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load credentials</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Your credentials</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState title="No credentials" description="Issued and held credentials will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credential</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.type || c.id}</div>
                        <div className="text-muted-foreground text-xs">{c.issuer || c.subjectDid || c.id}</div>
                      </TableCell>
                      <TableCell>{c.format || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "revoked" ? "destructive" : "secondary"}>
                          {c.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(c.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => void onRevoke(c.id)} disabled={busy !== null}>
                          {busy === c.id ? "Revoking…" : "Revoke"}
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
