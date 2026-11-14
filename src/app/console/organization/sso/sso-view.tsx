"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@fusorb/facet-layout";
import {
  Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@fusorb/facet-components";
import { useIdp } from "@/hooks/use-idp";
import type { IdpConnection } from "@fusorb/facet-sdk";

export function SsoView() {
  const { list, remove } = useIdp();
  const [items, setItems] = useState<IdpConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { const res = await list(); setItems(((res as any)?.data ?? []) as IdpConnection[]); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load SSO connections."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function onDelete(id: string) {
    setBusy(id); setError(null);
    try { await remove(id); setItems((p) => p.filter((x) => x.id !== id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete connection."); }
    finally { setBusy(null); }
  }

  return (
    <>
      <PageHeader title="SSO connections" description="Enterprise identity providers for this tenant." actions={<Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>} />
      <main className="p-6 space-y-4">
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Card><CardHeader><CardTitle>Connections</CardTitle></CardHeader><CardContent>
          {loading ? <Skeleton className="h-10 w-full" /> : items.length === 0 ? <EmptyState title="No SSO connections" description="Configured SAML/OIDC providers will appear here." /> : (
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Issuer / Entry</TableHead><TableHead /></TableRow></TableHeader><TableBody>
              {items.map((c) => (<TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell><Badge variant="secondary">{c.type}</Badge></TableCell><TableCell><Badge variant={c.enabled ? "success" : "secondary"}>{c.enabled ? "enabled" : "disabled"}</Badge></TableCell><TableCell className="text-xs max-w-xs truncate" title={c.issuer || c.entryPoint || c.metadataUrl || ""}>{c.issuer || c.entryPoint || c.metadataUrl || "—"}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => void onDelete(c.id)} disabled={busy !== null}>{busy === c.id ? "Deleting…" : "Delete"}</Button></TableCell></TableRow>))}
            </TableBody></Table>
          )}
        </CardContent></Card>
      </main>
    </>
  );
}
