"use client";

import { useState } from "react";
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
} from "@fusorb/facet-components";
import { useMfa } from "@/hooks/use-mfa";

type SetupData = { secret: string; qrCode: string };

export function MfaView() {
  const { setup, confirm, disable } = useMfa();
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<"setup" | "confirm" | "disable" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSetup() {
    setBusy("setup");
    setError(null);
    setMessage(null);
    setRecoveryCodes(null);
    try {
      const res = await setup();
      const data = (res as any)?.data as SetupData | undefined;
      if (!data?.secret || !data?.qrCode) {
        throw new Error("Unexpected response from MFA setup.");
      }
      setSetupData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start MFA setup.");
    } finally {
      setBusy(null);
    }
  }

  async function onConfirm() {
    if (!code.trim()) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy("confirm");
    setError(null);
    try {
      const res = await confirm(code.trim());
      const codes = (res as any)?.data?.recoveryCodes as string[] | undefined;
      setRecoveryCodes(Array.isArray(codes) ? codes : []);
      setSetupData(null);
      setCode("");
      setMessage("Two-factor authentication is enabled. Save your recovery codes in a safe place.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm MFA code.");
    } finally {
      setBusy(null);
    }
  }

  async function onDisable() {
    setBusy("disable");
    setError(null);
    setMessage(null);
    setRecoveryCodes(null);
    try {
      await disable();
      setSetupData(null);
      setCode("");
      setMessage("Two-factor authentication has been disabled.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disable MFA.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Two-factor authentication"
        description="Protect your account with a TOTP authenticator app."
      />
      <main className="p-6 space-y-4 max-w-2xl">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
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
            <CardTitle>Authenticator app (TOTP)</CardTitle>
            <CardDescription>
              Use an authenticator app to generate one-time codes when you sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!setupData ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void onSetup()} disabled={busy !== null}>
                  {busy === "setup" ? "Starting…" : "Set up two-factor"}
                </Button>
                <Button variant="outline" onClick={() => void onDisable()} disabled={busy !== null}>
                  {busy === "disable" ? "Disabling…" : "Disable two-factor"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app, or enter the secret manually.
                  </p>
                  {/* qrCode may be a data URL or an otpauth payload; render as image when possible */}
                  {setupData.qrCode.startsWith("data:") || setupData.qrCode.startsWith("http") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={setupData.qrCode} alt="MFA QR code" className="h-40 w-40 rounded border bg-white p-2" />
                  ) : (
                    <code className="block break-all rounded border p-2 text-xs">{setupData.qrCode}</code>
                  )}
                  <div>
                    <Label>Secret</Label>
                    <code className="mt-1 block break-all rounded border p-2 text-xs">{setupData.secret}</code>
                  </div>
                </div>
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="mfa-code">Verification code</Label>
                  <Input
                    id="mfa-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => void onConfirm()} disabled={busy !== null}>
                    {busy === "confirm" ? "Confirming…" : "Confirm and enable"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSetupData(null);
                      setCode("");
                    }}
                    disabled={busy !== null}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {recoveryCodes && recoveryCodes.length > 0 ? (
              <div className="space-y-2">
                <Label>Recovery codes</Label>
                <p className="text-sm text-muted-foreground">
                  Store these codes securely. Each code can be used once if you lose access to your authenticator.
                </p>
                <div className="grid grid-cols-2 gap-2 rounded border p-3 font-mono text-sm">
                  {recoveryCodes.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
