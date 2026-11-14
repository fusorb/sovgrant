"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fusorb/facet-components";
import { useAuth } from "@/hooks/use-auth";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setStatus("error"); setError("Missing verification token."); return; }
    let cancelled = false;
    (async () => {
      setStatus("loading");
      try {
        const res = await verifyEmail(token);
        if (cancelled) return;
        if ((res as any)?.error) throw new Error((res as any).error?.message || "Verification failed.");
        setStatus("ok");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Verification failed.");
        setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [token, verifyEmail]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Verify email</CardTitle><CardDescription>Confirm your email address.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {status === "loading" ? <div className="text-muted-foreground text-sm">Verifying…</div> : null}
        {status === "ok" ? <Alert><AlertTitle>Email verified</AlertTitle><AlertDescription>Your email address has been confirmed.</AlertDescription></Alert> : null}
        {status === "error" ? <Alert variant="destructive"><AlertTitle>Verification failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Button asChild variant="outline"><Link href="/login">Continue to sign in</Link></Button>
      </CardContent>
    </Card>
  );
}

export function VerifyEmailView() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
