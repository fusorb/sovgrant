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
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Switch,
} from "@fusorb/facet-components";
import { useTenant } from "@/hooks/use-tenant";
import { usePolicy } from "@/hooks/use-policy";
import type { TenantPolicy } from "@/sdk";

export function PoliciesView() {
  const { activeTenant } = useTenant();
  const { get, update } = usePolicy();
  const [policy, setPolicy] = useState<TenantPolicy>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!activeTenant?.id) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const res = await get(activeTenant.id);
        if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to load policy.");
        setPolicy(((res as any)?.data as TenantPolicy | null) ?? {});
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load policy.");
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenant?.id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTenant?.id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await update(activeTenant.id, policy);
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to update policy.");
      setMessage("Policy updated.");
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to update policy.");
    } finally {
      setSaving(false);
    }
  }

  if (!activeTenant) {
    return (
      <>
        <PageHeader title="Policies" description="Tenant policy and enforcement." />
        <main className="p-6 text-muted-foreground text-sm">Select an active workspace to manage its policy.</main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Policies" description={`Enforcement policy for ${activeTenant.name}.`} />
      <main className="p-6 space-y-4">
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {message ? <Alert><AlertTitle>Saved</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Tenant policy</CardTitle><CardDescription>Changes are enforced server-side for this tenant.</CardDescription></CardHeader>
          <CardContent>
            {loading ? <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div> : (
              <form className="space-y-4" onSubmit={onSave}>
                <div className="flex items-center justify-between gap-4"><Label htmlFor="requireMfa">Require MFA</Label><Switch id="requireMfa" checked={!!policy.requireMfa} onCheckedChange={(v) => setPolicy((p) => ({ ...p, requireMfa: v }))} /></div>
                <div className="flex items-center justify-between gap-4"><Label htmlFor="requireConsent">Require legal consent</Label><Switch id="requireConsent" checked={!!policy.requireLegalConsent} onCheckedChange={(v) => setPolicy((p) => ({ ...p, requireLegalConsent: v }))} /></div>
                <div className="flex items-center justify-between gap-4"><Label htmlFor="allowPasskeys">Allow passkeys</Label><Switch id="allowPasskeys" checked={policy.allowPasskeys !== false} onCheckedChange={(v) => setPolicy((p) => ({ ...p, allowPasskeys: v }))} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1"><Label htmlFor="ttl">Session TTL (minutes)</Label><Input id="ttl" type="number" value={policy.sessionTtlMinutes ?? ""} onChange={(e) => setPolicy((p) => ({ ...p, sessionTtlMinutes: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                  <div className="space-y-1"><Label htmlFor="max">Max sessions per user</Label><Input id="max" type="number" value={policy.maxSessionsPerUser ?? ""} onChange={(e) => setPolicy((p) => ({ ...p, maxSessionsPerUser: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                </div>
                <div className="space-y-1"><Label htmlFor="domains">Allowed email domains (comma-separated)</Label><Input id="domains" value={(policy.allowedEmailDomains || []).join(", ")} onChange={(e) => setPolicy((p) => ({ ...p, allowedEmailDomains: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} placeholder="example.com, corp.example" /></div>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save policy"}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
