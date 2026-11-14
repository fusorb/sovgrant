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
import { useExternalIds } from "@/hooks/use-external-ids";
import type { ExternalIdType } from "@/sdk";

type ExternalId = {
  id: string;
  type?: string | null;
  displayValue?: string | null;
  verified?: boolean | null;
  createdAt?: string | null;
};

const TYPES: ExternalIdType[] = ["email", "phone", "nin", "bvn", "passport", "driver_license"];
const VERIFIABLE = new Set(["email", "phone"]);

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function ExternalIdsView() {
  const { list, link, unlink, requestVerification, confirmVerification } = useExternalIds();
  const [items, setItems] = useState<ExternalId[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ExternalIdType>("email");
  const [value, setValue] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await list();
      setItems(((res as any)?.data ?? []) as ExternalId[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load external identifiers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLink(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setError("Enter a value to link.");
      return;
    }
    setBusy("link");
    setError(null);
    setMessage(null);
    try {
      await link({ type, value: value.trim(), displayValue: displayValue.trim() || undefined });
      setValue("");
      setDisplayValue("");
      setMessage("Identifier linked.");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to link identifier.");
    } finally {
      setBusy(null);
    }
  }

  async function onRequest(id: string) {
    setBusy(id);
    setError(null);
    setMessage(null);
    try {
      await requestVerification(id);
      setMessage("Verification code sent (if the identifier is verifiable).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to request verification.");
    } finally {
      setBusy(null);
    }
  }

  async function onConfirm(id: string) {
    const code = (codes[id] || "").trim();
    if (!code) {
      setError("Enter the verification code you received.");
      return;
    }
    setBusy(id);
    setError(null);
    setMessage(null);
    try {
      await confirmVerification(id, code);
      setCodes((prev) => ({ ...prev, [id]: "" }));
      setMessage("Identifier verified.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm verification.");
    } finally {
      setBusy(null);
    }
  }

  async function onUnlink(id: string) {
    setBusy(id);
    setError(null);
    setMessage(null);
    try {
      await unlink(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unlink identifier.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="External identifiers"
        description="Linked cross-system identifiers for your identity."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading || busy !== null}>
            Refresh
          </Button>
        }
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {message ? (
          <Alert>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Link an identifier</CardTitle>
            <CardDescription>
              Only email and phone can be verified today; others can be linked for reference.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-4 sm:items-end" onSubmit={onLink}>
              <div className="space-y-1">
                <Label htmlFor="ext-type">Type</Label>
                <select
                  id="ext-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as ExternalIdType)}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="ext-value">Value</Label>
                <Input id="ext-value" value={value} onChange={(e) => setValue(e.target.value)} placeholder="email, phone, ID…" />
              </div>
              <Button type="submit" disabled={busy !== null}>
                {busy === "link" ? "Linking…" : "Link"}
              </Button>
              <div className="space-y-1 sm:col-span-3">
                <Label htmlFor="ext-display">Display value (optional)</Label>
                <Input id="ext-display" value={displayValue} onChange={(e) => setDisplayValue(e.target.value)} placeholder="Label shown in UI" />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linked identifiers</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState title="No linked identifiers" description="Link an email, phone, or other identifier above." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((x) => {
                    const canVerify = VERIFIABLE.has(String(x.type || "")) && !x.verified;
                    return (
                      <TableRow key={x.id}>
                        <TableCell>
                          <div className="font-medium">{x.displayValue || x.id}</div>
                          <div className="text-muted-foreground text-xs">{x.type || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={x.verified ? "success" : "secondary"}>
                            {x.verified ? "verified" : "unverified"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(x.createdAt)}</TableCell>
                        <TableCell className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {canVerify ? (
                              <Button size="sm" variant="outline" onClick={() => void onRequest(x.id)} disabled={busy !== null}>
                                {busy === x.id ? "…" : "Send code"}
                              </Button>
                            ) : null}
                            <Button size="sm" variant="outline" onClick={() => void onUnlink(x.id)} disabled={busy !== null}>
                              Unlink
                            </Button>
                          </div>
                          {canVerify ? (
                            <div className="flex gap-2 max-w-xs">
                              <Input
                                placeholder="Code"
                                value={codes[x.id] || ""}
                                onChange={(e) => setCodes((prev) => ({ ...prev, [x.id]: e.target.value }))}
                              />
                              <Button size="sm" onClick={() => void onConfirm(x.id)} disabled={busy !== null}>
                                Confirm
                              </Button>
                            </div>
                          ) : null}
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
