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
import { useWebhooks } from "@/hooks/use-webhooks";
import type { WebhookEndpoint, WebhookEvent } from "@fusorb/facet-sdk";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function WebhooksView() {
  const { list, create, remove, test, listEvents, retryEvent } = useWebhooks();
  const [items, setItems] = useState<WebhookEndpoint[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [eventTypes, setEventTypes] = useState("identity.created,identity.updated");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await list();
      setItems(((res as any)?.data ?? []) as WebhookEndpoint[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load webhooks.");
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents() {
    setEventsLoading(true);
    try {
      const res = await listEvents();
      setEvents(((res as any)?.data ?? []) as WebhookEvent[]);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const types = eventTypes.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (!url.trim() || types.length === 0) {
      setError("Endpoint URL and at least one event type are required.");
      return;
    }
    setBusy("create");
    setError(null);
    setMessage(null);
    setCreatedSecret(null);
    try {
      const res = await create({ url: url.trim(), eventTypes: types, enabled: true });
      const secret = (res as any)?.data?.secret as string | undefined;
      if (secret) setCreatedSecret(secret);
      setUrl("");
      setMessage("Webhook endpoint created.");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create webhook.");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(id: string) {
    setBusy(id);
    setError(null);
    setMessage(null);
    try {
      await remove(id);
      setItems((prev) => prev.filter((w) => w.id !== id));
      setMessage("Webhook deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete webhook.");
    } finally {
      setBusy(null);
    }
  }

  async function onTest(id: string) {
    setBusy(id);
    setError(null);
    setMessage(null);
    try {
      await test(id);
      setMessage("Test event sent.");
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send test event.");
    } finally {
      setBusy(null);
    }
  }

  async function onRetry(id: string) {
    setBusy(id);
    setError(null);
    try {
      await retryEvent(id);
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to retry event.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Event delivery endpoints for this tenant."
        actions={<Button variant="outline" onClick={() => { void load(); void loadEvents(); }} disabled={loading || busy !== null}>Refresh</Button>}
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
            <AlertTitle>Webhook secret — copy it now</AlertTitle>
            <AlertDescription>
              <div className="mt-2 font-mono text-xs break-all select-all rounded bg-muted p-2">{createdSecret}</div>
              <div className="mt-1 text-xs">The signing secret is shown only at creation time.</div>
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Create endpoint</CardTitle>
            <CardDescription>Deliver selected event types to an HTTPS endpoint.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-3 sm:items-end" onSubmit={onCreate}>
              <div className="space-y-1">
                <Label htmlFor="wh-url">Endpoint URL</Label>
                <Input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhooks/sovgrant" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wh-events">Event types</Label>
                <Input id="wh-events" value={eventTypes} onChange={(e) => setEventTypes(e.target.value)} placeholder="identity.created, credential.issued" />
              </div>
              <Button type="submit" disabled={busy !== null}>{busy === "create" ? "Creating…" : "Create webhook"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Endpoints</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : items.length === 0 ? (
              <EmptyState title="No webhooks" description="Create an endpoint to receive events." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs max-w-xs truncate" title={w.url}>{w.url}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={(w.eventTypes || []).join(", ")}>{(w.eventTypes || []).join(", ") || "—"}</TableCell>
                      <TableCell><Badge variant={w.enabled ? "success" : "secondary"}>{w.enabled ? "enabled" : "disabled"}</Badge></TableCell>
                      <TableCell>{formatDate(w.createdAt)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => void onTest(w.id)} disabled={busy !== null}>{busy === w.id ? "…" : "Test"}</Button>
                        <Button size="sm" variant="outline" onClick={() => void onDelete(w.id)} disabled={busy !== null}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent events</CardTitle></CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /></div>
            ) : events.length === 0 ? (
              <EmptyState title="No events" description="Delivered webhook events will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-mono text-xs">{ev.eventType}</TableCell>
                      <TableCell><Badge variant={ev.status === "delivered" ? "success" : ev.status === "failed" ? "destructive" : "secondary"}>{ev.status}</Badge></TableCell>
                      <TableCell>{ev.attempts ?? "—"}</TableCell>
                      <TableCell>{formatDate(ev.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {ev.status === "failed" ? (
                          <Button size="sm" variant="outline" onClick={() => void onRetry(ev.id)} disabled={busy !== null}>{busy === ev.id ? "Retrying…" : "Retry"}</Button>
                        ) : null}
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
