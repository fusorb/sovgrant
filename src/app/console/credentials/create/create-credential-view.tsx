"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Textarea,
} from "@fusorb/facet-components";
import { useCredentials } from "@/hooks/use-credentials";

export function CreateCredentialView() {
  const router = useRouter();
  const { issue } = useCredentials();
  const [subjectDid, setSubjectDid] = useState("");
  const [schemaId, setSchemaId] = useState("");
  const [format, setFormat] = useState<"JWT" | "LDP" | "SD_JWT">("JWT");
  const [subjectJson, setSubjectJson] = useState("{\n  \n}");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    let credentialSubject: Record<string, unknown>;
    try {
      const parsed = JSON.parse(subjectJson || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Credential subject must be a JSON object.");
      }
      credentialSubject = parsed as Record<string, unknown>;
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Credential subject must be valid JSON.");
      return;
    }
    if (!subjectDid.trim()) {
      setError("Subject DID is required.");
      return;
    }
    setBusy(true);
    try {
      await issue({
        subjectDid: subjectDid.trim(),
        credentialSubject: credentialSubject as any,
        format,
        schemaId: schemaId.trim() || undefined,
      });
      setOk(true);
      setTimeout(() => router.push("/console/credentials"), 600);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to issue credential.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Issue credential" description="Create a verifiable credential." />
      <main className="p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>New credential</CardTitle>
            <CardDescription>Issue a credential to a subject DID (policy/consent gates apply on the server).</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Could not issue credential</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {ok ? (
                <Alert>
                  <AlertTitle>Credential issued</AlertTitle>
                  <AlertDescription>Redirecting to credentials…</AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cred-subject">Subject DID</Label>
                  <Input id="cred-subject" value={subjectDid} onChange={(e) => setSubjectDid(e.target.value)} placeholder="did:web:…" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cred-format">Format</Label>
                  <select
                    id="cred-format"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as "JWT" | "LDP" | "SD_JWT")}
                  >
                    <option value="JWT">JWT</option>
                    <option value="SD_JWT">SD-JWT</option>
                    <option value="LDP">LDP</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cred-schema">Schema ID (optional)</Label>
                  <Input id="cred-schema" value={schemaId} onChange={(e) => setSchemaId(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cred-subject-json">Credential subject (JSON object)</Label>
                <Textarea id="cred-subject-json" rows={8} value={subjectJson} onChange={(e) => setSubjectJson(e.target.value)} className="font-mono text-xs" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>{busy ? "Issuing…" : "Issue credential"}</Button>
                <Button type="button" variant="outline" onClick={() => router.push("/console/credentials")}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
