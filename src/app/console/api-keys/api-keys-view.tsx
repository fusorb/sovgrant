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
import { useApiKeys } from "@/hooks/use-api-keys";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix?: string | null;
  scopes?: string[] | null;
  status?: string | null;
  lastUsedAt?: string | null;
  createdAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function ApiKeysView() {
  const { list, create, revoke } = useApiKeys();
  const [items, setItems] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("identity:read");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await list();
      setItems(((res as any)?.data ?? []) as ApiKey[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load API keys.");
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
    if (!name.trim()) {
      setError("Enter a name for the API key.");
      return;
    }
    setBusy("create");
    setError(null);
    setCreatedKey(null);
    try {
      const parsedScopes = scopes.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
      const res = await create({ name: name.trim(), scopes: parsedScopes.length ? parsedScopes : undefined });
      const key = (res as any)?.data?.key as string | undefined;
      if (key) setCreatedKey(key);
      setName("");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create API key.");
    } finally {
      setBusy(null);
    }
  }

  async function onRevoke(id: string) {
    setBusy(id);
    setError(null);
    try {
      await revoke(id);
      setItems((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke API key.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="API keys"
        description="Machine-to-machine credentials for this tenant."
        actions={<Button variant="outline" onClick={() => void load()} disabled={loading || busy !== null}>Refresh</Button>}
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive"><AlertTitle>Action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        ) : null}
        {createdKey ? (
          <Alert>
            <AlertTitle>API key created — copy it now</AlertTitle>
            <AlertDescription>
              <div className="mt-2 font-mono text-xs break-all select-all rounded bg-muted p-2">{createdKey}</div>
              <div className="mt-1 text-xs">This plaintext key is shown only once.</div>
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Create API key</CardTitle>
            <CardDescription>Keys are scoped; store the plaintext secret securely — it cannot be retrieved again.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-3 sm:items-end" onSubmit={onCreate}>
              <div className="space-y-1">
                <Label htmlFor="key-name">Name</Label>
                <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="CI deploy key" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="key-scopes">Scopes (space/comma separated)</Label>
                <Input id="key-scopes" value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="identity:read" />
              </div>
              <Button type="submit" disabled={busy !== null}>{busy === "create" ? "Creating…" : "Create key"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Keys</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : items.length === 0 ? (
              <EmptyState title="No API keys" description="Create a key for service-to-service access." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell>
                        <div className="font-medium">{k.name}</div>
                        <div className="text-muted-foreground text-xs">{(k.scopes || []).join(", ") || "—"}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{k.keyPrefix || "—"}</TableCell>
                      <TableCell><Badge variant={k.status === "active" ? "success" : "secondary"}>{k.status || "—"}</Badge></TableCell>
                      <TableCell>{formatDate(k.lastUsedAt)}</TableCell>
                      <TableCell>{formatDate(k.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => void onRevoke(k.id)} disabled={busy !== null}>
                          {busy === k.id ? "Revoking…" : "Revoke"}
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
