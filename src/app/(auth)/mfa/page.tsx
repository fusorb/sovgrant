"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MfaDialog } from "@fusorb/facet-auth";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@fusorb/facet-components";
import { identity } from "@/sdk";

export default function MfaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") ?? undefined;
  const [showDeviceApproval, setShowDeviceApproval] = useState(false);
  const [challenge, setChallenge] = useState<any>(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);

  const startDeviceApproval = async () => {
    setStatus("creating");
    setError(null);
    try {
      const res: any = await identity.createDeviceApproval({ sessionId });
      const ch = res?.data?.challenge ?? res?.challenge;
      setChallenge(ch);
      setStatus("pending");
      setShowDeviceApproval(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
      setStatus("idle");
    }
  };

  useEffect(() => {
    if (!challenge || status !== "pending") return;
    const interval = setInterval(async () => {
      try {
        const res: any = await identity.pollDeviceApproval(challenge);
        const s = res?.data?.status ?? res?.status;
        if (s === "approved") {
          setStatus("approved");
          clearInterval(interval);
          router.replace("/console");
        } else if (s === "rejected") {
          setStatus("rejected");
          clearInterval(interval);
          setError("Rejected");
        } else if (s === "expired") {
          setStatus("expired");
          clearInterval(interval);
          setError("Expired");
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [challenge, status, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <MfaDialog
        open={!showDeviceApproval}
        client={useAuth().client}
        sessionId={sessionId ?? ""}
        onComplete={() => router.replace("/console")}
        onCancel={() => router.replace("/login")}
      />
      {!showDeviceApproval && (
        <Button variant="outline" onClick={startDeviceApproval} disabled={status === "creating"}>
          {status === "creating" ? "Creating..." : "Approve with SovPort"}
        </Button>
      )}
      {showDeviceApproval && (
        <div className="text-center space-y-2">
          <p className="text-sm">Approve from your paired SovPort</p>
          {status === "pending" && <p className="text-xs text-muted-foreground">Waiting...</p>}
          {status === "approved" && <p className="text-xs text-green-600">Approved</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowDeviceApproval(false);
              setStatus("idle");
              setChallenge(null);
            }}
          >
            Back to code
          </Button>
        </div>
      )}
    </div>
  );
}
