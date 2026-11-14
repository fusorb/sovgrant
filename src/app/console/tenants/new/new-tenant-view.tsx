"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@fusorb/facet-layout";
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@fusorb/facet-components";
import { useTenant } from "@/hooks/use-tenant";

export function NewTenantView() {
  const router = useRouter();
  const { createTenant } = useTenant();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) { setError("Name and slug are required."); return; }
    setBusy(true); setError(null);
    try {
      const res = await createTenant(name.trim(), slug.trim());
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to create workspace.");
      router.push("/console");
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create workspace.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="New workspace" description="Create a tenant." />
      <main className="p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Create workspace</CardTitle>
            <CardDescription>Choose a name and a unique slug for the new tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
              <div className="space-y-1"><Label htmlFor="tname">Name</Label><Input id="tname" value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-1"><Label htmlFor="tslug">Slug</Label><Input id="tslug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-workspace" required /></div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create workspace"}</Button>
                <Button type="button" variant="outline" onClick={() => router.push("/console/tenants")}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
