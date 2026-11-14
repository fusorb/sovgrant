"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@fusorb/facet-layout";
import {
  Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Input, Label, Skeleton,
} from "@fusorb/facet-components";
import { useTenant } from "@/hooks/use-tenant";
import { useTenantDid } from "@/hooks/use-tenant-did";
import type { TenantDid } from "@fusorb/facet-sdk";

export function DidView() {
  const { activeTenant } = useTenant();
  const { get, provision } = useTenantDid();
  const [did, setDid] = useState<TenantDid | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [domain, setDomain] = useState("");

  async function load() {
    if (!activeTenant?.id) { setDid(null); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await get(activeTenant.id);
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to load DID.");
      setDid(((res as any)?.data as TenantDid | null) ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load DID."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeTenant?.id]);

  async function onProvision(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTenant?.id || !domain.trim()) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const res = await provision(activeTenant.id, domain.trim());
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to provision DID.");
      setMessage("DID provisioned.");
      setDomain("");
      await load();
    } catch (e2) { setError(e2 instanceof Error ? e2.message : "Failed to provision DID."); }
    finally { setBusy(false); }
  }

  if (!activeTenant) return (<><PageHeader title="DID" description="did:web identity for this tenant." /><main className="p-6"><EmptyState title="No active workspace" description="Select a tenant to view its DID." /></main></>);

  return (
    <>
      <PageHeader title="DID" description={`did:web identity for ${activeTenant.name}.`} actions={<Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>} />
      <main className="p-6 space-y-4">
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {message ? <Alert><AlertTitle>Success</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Tenant DID</CardTitle><CardDescription>Decentralized identifier used for signing and verification.</CardDescription></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-full" /> : did ? (
              <div className="space-y-2">
                <div><span className="text-muted-foreground text-sm">DID</span><div className="font-mono text-sm break-all">{did.did}</div></div>
                <div className="text-muted-foreground text-xs">Created {new Date(did.createdAt).toLocaleString()}</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-muted-foreground text-sm">No DID provisioned for this tenant yet.</div>
                <form className="flex gap-3 items-end" onSubmit={onProvision}>
                  <div className="space-y-1 flex-1"><Label htmlFor="did-domain">Domain</Label><Input id="did-domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" /></div>
                  <Button type="submit" disabled={busy || !domain.trim()}>{busy ? "Provisioning…" : "Provision DID"}</Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
