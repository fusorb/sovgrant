"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@fusorb/facet-layout";
import {
  Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@fusorb/facet-components";
import { useTenant } from "@/hooks/use-tenant";
import { useSigningKeys } from "@/hooks/use-signing-keys";
import type { SigningKey } from "@fusorb/facet-sdk";

export function SigningKeysView() {
  const { activeTenant } = useTenant();
  const { list, create, revoke } = useSigningKeys();
  const [items, setItems] = useState<SigningKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  async function load() {
    if (!activeTenant?.id) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await list(activeTenant.id);
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to load signing keys.");
      setItems(((res as any)?.data ?? []) as SigningKey[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load signing keys."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeTenant?.id]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTenant?.id) return;
    setBusy("create"); setError(null);
    try {
      const res = await create(activeTenant.id, { displayName: displayName.trim() || undefined });
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to create key.");
      setDisplayName(""); await load();
    } catch (e2) { setError(e2 instanceof Error ? e2.message : "Failed to create key."); }
    finally { setBusy(null); }
  }
  async function onRevoke(kid: string) {
    if (!activeTenant?.id) return;
    setBusy(kid); setError(null);
    try { await revoke(activeTenant.id, kid); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to revoke key."); }
    finally { setBusy(null); }
  }

  if (!activeTenant) return (<><PageHeader title="Signing keys" description="Cryptographic keys used to sign." /><main className="p-6 text-muted-foreground text-sm">Select an active workspace first.</main></>);

  return (
    <>
      <PageHeader title="Signing keys" description={`Keys for ${activeTenant.name}.`} actions={<Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>} />
      <main className="p-6 space-y-4">
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Card><CardHeader><CardTitle>Create signing key</CardTitle></CardHeader><CardContent>
          <form className="flex gap-3 items-end" onSubmit={onCreate}>
            <div className="space-y-1 flex-1 max-w-sm"><Label htmlFor="dname">Display name (optional)</Label><Input id="dname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
            <Button type="submit" disabled={busy !== null}>{busy === "create" ? "Creating…" : "Create key"}</Button>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Keys</CardTitle></CardHeader><CardContent>
          {loading ? <Skeleton className="h-10 w-full" /> : items.length === 0 ? <EmptyState title="No signing keys" description="Create a key to sign DIDs and credentials." /> : (
            <Table><TableHeader><TableRow><TableHead>Key ID</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Expires</TableHead><TableHead /></TableRow></TableHeader><TableBody>
              {items.map((k) => (<TableRow key={k.kid}><TableCell className="font-mono text-xs">{k.kid}</TableCell><TableCell><Badge variant={k.status === "ACTIVE" ? "success" : k.status === "REVOKED" ? "destructive" : "secondary"}>{k.status}</Badge></TableCell><TableCell>{k.createdAt ? new Date(k.createdAt).toLocaleString() : "—"}</TableCell><TableCell>{k.expiresAt ? new Date(k.expiresAt).toLocaleString() : "—"}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => void onRevoke(k.kid)} disabled={busy !== null || k.status !== "ACTIVE"}>{busy === k.kid ? "Revoking…" : "Revoke"}</Button></TableCell></TableRow>))}
            </TableBody></Table>
          )}
        </CardContent></Card>
      </main>
    </>
  );
}
