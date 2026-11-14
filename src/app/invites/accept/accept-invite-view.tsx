"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@fusorb/facet-layout";
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@fusorb/facet-components";
import { useTenant } from "@/hooks/use-tenant";

export function AcceptInviteView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { acceptInvite } = useTenant();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  async function onAccept(e?: React.FormEvent) {
    e?.preventDefault();
    if (!token.trim()) { setError("Invitation token is required."); return; }
    setBusy(true); setError(null);
    try {
      const res = await acceptInvite(token.trim());
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to accept invitation.");
      setOk(true);
      setTimeout(() => router.push("/console/tenants"), 800);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to accept invitation.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Accept invitation" description="Join a workspace." />
      <main className="p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Workspace invitation</CardTitle>
            <CardDescription>Enter or confirm your invitation token to join.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onAccept}>
              {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
              {ok ? <Alert><AlertTitle>Invitation accepted</AlertTitle><AlertDescription>Redirecting to your workspaces…</AlertDescription></Alert> : null}
              <div className="space-y-1"><Label htmlFor="invite-token">Invitation token</Label><Input id="invite-token" value={token} onChange={(e) => setToken(e.target.value)} /></div>
              <Button type="submit" disabled={busy || !token.trim()}>{busy ? "Accepting…" : "Accept invitation"}</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
