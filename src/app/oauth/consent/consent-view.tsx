"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@fusorb/facet-layout";
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fusorb/facet-components";
import { useOAuth } from "@/hooks/use-oauth";

export function ConsentView() {
  const searchParams = useSearchParams();
  const { grantConsent } = useOAuth();
  const clientId = searchParams.get("client_id") || "";
  const scopeParam = searchParams.get("scope") || searchParams.get("scopes") || "";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const state = searchParams.get("state") || "";
  const scopes = useMemo(() => scopeParam.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean), [scopeParam]);
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onAllow() {
    if (!clientId) { setError("Missing client_id."); return; }
    setBusy("allow"); setError(null); setOk(null);
    try {
      const res = await grantConsent({ clientId, scopes });
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to grant consent.");
      setOk("Consent granted.");
      if (redirectUri) {
        try {
          const u = new URL(redirectUri);
          if (state) u.searchParams.set("state", state);
          window.location.href = u.toString();
        } catch {
          // leave success message if redirect can't be constructed safely
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to grant consent."); }
    finally { setBusy(null); }
  }

  function onDeny() {
    if (redirectUri) {
      try {
        const u = new URL(redirectUri);
        u.searchParams.set("error", "access_denied");
        if (state) u.searchParams.set("state", state);
        window.location.href = u.toString();
        return;
      } catch {}
    }
    setOk("Access denied.");
  }

  return (
    <>
      <PageHeader title="Authorize application" description="Review requested access." />
      <main className="p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Consent request</CardTitle>
            <CardDescription>{clientId ? `Client: ${clientId}` : "An application is requesting access to your account."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            {ok ? <Alert><AlertTitle>Done</AlertTitle><AlertDescription>{ok}</AlertDescription></Alert> : null}
            <div>
              <div className="text-sm font-medium mb-2">Requested scopes</div>
              {scopes.length ? (
                <div className="flex flex-wrap gap-2">{scopes.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
              ) : <div className="text-muted-foreground text-sm">No scopes specified.</div>}
            </div>
            {redirectUri ? <div className="text-muted-foreground text-xs break-all">Redirect: {redirectUri}</div> : null}
            <div className="flex gap-2">
              <Button onClick={() => void onAllow()} disabled={busy !== null || !clientId}>{busy === "allow" ? "Allowing…" : "Allow"}</Button>
              <Button variant="outline" onClick={onDeny} disabled={busy !== null}>Deny</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
