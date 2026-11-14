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
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@fusorb/facet-components";
import { usePasskeys } from "@/hooks/use-passkeys";

type Passkey = {
  id: string;
  credentialId?: string;
  name?: string | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): ArrayBuffer {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function decodeCreationOptions(options: any): PublicKeyCredentialCreationOptions {
  const publicKey = options?.publicKey ?? options;
  return {
    ...publicKey,
    challenge: typeof publicKey.challenge === "string" ? fromBase64Url(publicKey.challenge) : publicKey.challenge,
    user: {
      ...publicKey.user,
      id: typeof publicKey.user?.id === "string" ? fromBase64Url(publicKey.user.id) : publicKey.user?.id,
    },
    excludeCredentials: (publicKey.excludeCredentials ?? []).map((c: any) => ({
      ...c,
      id: typeof c.id === "string" ? fromBase64Url(c.id) : c.id,
    })),
  };
}

function serializeAttestation(cred: PublicKeyCredential): unknown {
  const response = cred.response as AuthenticatorAttestationResponse;
  return {
    id: cred.id,
    rawId: toBase64Url(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment,
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      attestationObject: toBase64Url(response.attestationObject),
      transports: typeof response.getTransports === "function" ? response.getTransports() : undefined,
    },
    clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
  };
}

export function PasskeysView() {
  const { list, registrationOptions, register, deregister } = usePasskeys();
  const [items, setItems] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await list();
      setItems(((res as any)?.data ?? []) as Passkey[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load passkeys.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRegister() {
    setBusy("register");
    setError(null);
    setMessage(null);
    try {
      if (typeof window === "undefined" || !window.PublicKeyCredential || !navigator.credentials) {
        throw new Error("Passkeys are not supported in this browser.");
      }
      const optRes = await registrationOptions();
      const payload = (optRes as any)?.data;
      const options = payload?.options ?? payload;
      const challengeId = payload?.challengeId;
      if (!options || !challengeId) {
        throw new Error("Could not start passkey registration.");
      }
      const publicKey = decodeCreationOptions(options);
      const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
      if (!cred) throw new Error("Passkey registration was cancelled.");
      await register({ response: serializeAttestation(cred), challengeId });
      setMessage("Passkey registered.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to register passkey.");
    } finally {
      setBusy(null);
    }
  }

  async function onRemove(id: string) {
    setBusy(id);
    setError(null);
    setMessage(null);
    try {
      await deregister(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove passkey.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Passkeys"
        description="Manage WebAuthn passkeys for passwordless sign-in."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading || busy !== null}>
              Refresh
            </Button>
            <Button onClick={() => void onRegister()} disabled={busy !== null}>
              {busy === "register" ? "Registering…" : "Add passkey"}
            </Button>
          </div>
        }
      />
      <main className="p-6 space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Passkey action failed</AlertTitle>
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
            <CardTitle>Registered passkeys</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState title="No passkeys" description="Add a passkey to sign in without a password." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Passkey</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        <div>{p.name || p.id}</div>
                        {p.credentialId ? (
                          <div className="text-muted-foreground truncate max-w-[260px]" title={p.credentialId}>
                            {p.credentialId}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{formatDate(p.createdAt)}</TableCell>
                      <TableCell>{formatDate(p.lastUsedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => void onRemove(p.id)} disabled={busy !== null}>
                          {busy === p.id ? "Removing…" : "Remove"}
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
