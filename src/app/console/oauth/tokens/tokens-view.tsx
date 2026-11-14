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
import { useOAuth } from "@/hooks/use-oauth";
import type { OAuthToken } from "@fusorb/facet-sdk";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function TokensView() {
  const { listTokens, revokeToken } = useOAuth();
  const [items, setItems] = useState<OAuthToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await listTokens();
      setItems(((res as any)?.data ?? []) as OAuthToken[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load OAuth tokens.");
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
      await revokeToken(id);
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, revoked: true } : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke token.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="OAuth tokens"
        description="Issued access tokens for OAuth clients."
        actions={<Button variant="outline" onClick={() => void load()} disabled={loading || busy !== null}>Refresh</Button>}
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive"><AlertTitle>Could not load tokens</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        ) : null}
        <Card>
          <CardHeader><CardTitle>Tokens</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : items.length === 0 ? (
              <EmptyState title="No tokens" description="Issued OAuth access tokens will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.clientName || t.clientId}</div>
                        <div className="text-muted-foreground text-xs font-mono">{t.clientId}</div>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={(t.scopes || []).join(", ")}>
                        {(t.scopes || []).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.revoked ? "destructive" : "success"}>{t.revoked ? "revoked" : "active"}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(t.expiresAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => void onRevoke(t.id)} disabled={busy !== null || !!t.revoked}>
                          {busy === t.id ? "Revoking…" : "Revoke"}
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
