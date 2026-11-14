"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@fusorb/facet-layout";
import {
  Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label,
} from "@fusorb/facet-components";
import { useAuth, UserButton } from "@fusorb/facet-auth";
import { useProfile } from "@/hooks/use-profile";

export function UserView() {
  const { user } = useAuth();
  const { updateProfile, deleteAccount } = useProfile();
  const [name, setName] = useState(user?.name ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save"); setError(null); setMessage(null);
    try {
      const res = await updateProfile({ name: name.trim() || undefined });
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to update profile.");
      setMessage("Profile updated.");
    } catch (e2) { setError(e2 instanceof Error ? e2.message : "Failed to update profile."); }
    finally { setBusy(null); }
  }

  async function onDelete() {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    setBusy("delete"); setError(null); setMessage(null);
    try {
      const res = await deleteAccount();
      if ((res as any)?.error) throw new Error((res as any).error?.message || "Failed to delete account.");
      setMessage("Account deletion requested.");
    } catch (e2) { setError(e2 instanceof Error ? e2.message : "Failed to delete account."); }
    finally { setBusy(null); }
  }

  return (
    <>
      <PageHeader title="Account" description="Profile, security, and password." />
      <main className="p-6 space-y-4 max-w-2xl">
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {message ? <Alert><AlertTitle>Success</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>{user?.email || "Signed-in account details."}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSave}>
              <div className="space-y-1"><Label htmlFor="name">Display name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={user?.name || ""} /></div>
              <div className="text-muted-foreground text-xs">Email: {user?.email || "—"} · ID: <span className="font-mono">{user?.id || "—"}</span></div>
              <Button type="submit" disabled={busy !== null}>{busy === "save" ? "Saving…" : "Save profile"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Security</CardTitle><CardDescription>Manage authentication methods and sessions.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/console/security/sessions">Sessions</Link></Button>
            <Button asChild variant="outline"><Link href="/console/security/mfa">Multi-factor auth</Link></Button>
            <Button asChild variant="outline"><Link href="/console/security/passkeys">Passkeys</Link></Button>
            <Button asChild variant="outline"><Link href="/console/security/devices">Devices</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Danger zone</CardTitle><CardDescription>Irreversible account actions.</CardDescription></CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => void onDelete()} disabled={busy !== null}>{busy === "delete" ? "Working…" : "Delete account"}</Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
