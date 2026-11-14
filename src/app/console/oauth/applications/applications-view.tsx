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
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@fusorb/facet-components";
import { useOAuth } from "@/hooks/use-oauth";
import type { OAuthClient } from "@fusorb/facet-sdk";

export function ApplicationsView() {
  const { listClients, createClient, deleteClient } = useOAuth();
  const [items, setItems] = useState<OAuthClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await listClients();
      setItems(((res as any)?.data ?? []) as OAuthClient[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load OAuth applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const uris = redirectUris.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (!name.trim() || uris.length === 0) {
      setError("Name and at least one redirect URI are required.");
      return;
    }
    setBusy("create");
    setError(null);
    setMessage(null);
    setCreatedSecret(null);
    try {
      const res = await createClient({ name: name.trim(), redirectUris: uris });
      const secret = (res as any)?.data?.clientSecret as string | undefined;
      if (secret) setCreatedSecret(secret);
      setName("");
      setRedirectUris("");
      setMessage("Application created.");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create application.");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(clientId: string) {
    setBusy(clientId);
    setError(null);
    setMessage(null);
    try {
      await deleteClient(clientId);
      setItems((prev) => prev.filter((c) => (c.clientId || c.id) !== clientId && c.id !== clientId));
      setMessage("Application deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete application.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="OAuth applications"
        description="Registered OAuth clients for this tenant."
        actions={<Button variant="outline" onClick={() => void load()} disabled={loading || busy !== null}>Refresh</Button>}
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive"><AlertTitle>Action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        ) : null}
        {message ? (
          <Alert><AlertTitle>Success</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>
        ) : null}
        {createdSecret ? (
          <Alert>
            <AlertTitle>Client secret — copy it now</AlertTitle>
            <AlertDescription>
              <div className="mt-2 font-mono text-xs break-all select-all rounded bg-muted p-2">{createdSecret}</div>
              <div className="mt-1 text-xs">The client secret is shown only at creation time.</div>
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Register application</CardTitle>
            <CardDescription>Create an OAuth client. Add redirect URIs as space/comma-separated values.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-3 sm:items-end" onSubmit={onCreate}>
              <div className="space-y-1">
                <Label htmlFor="app-name">Name</Label>
                <Input id="app-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My app" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="app-uris">Redirect URIs</Label>
                <Input id="app-uris" value={redirectUris} onChange={(e) => setRedirectUris(e.target.value)} placeholder="https://app.example/callback" />
              </div>
              <Button type="submit" disabled={busy !== null}>{busy === "create" ? "Creating…" : "Create application"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : items.length === 0 ? (
              <EmptyState title="No applications" description="Registered OAuth clients will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Redirect URIs</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => {
                    const clientId = c.clientId || c.id;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="font-mono text-xs">{clientId}</TableCell>
                        <TableCell><Badge variant="secondary">{c.public ? "public" : "confidential"}</Badge></TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={(c.redirectUris || []).join(", ")}>
                          {(c.redirectUris || []).join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => void onDelete(clientId)} disabled={busy !== null}>
                            {busy === clientId ? "Deleting…" : "Delete"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
