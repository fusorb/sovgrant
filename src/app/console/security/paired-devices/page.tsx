"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@fusorb/facet-layout";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@fusorb/facet-components";
import { apiFetch } from "@/lib/api-fetch";

interface PairedDevice {
  id: string;
  deviceId: string;
  name?: string | null;
  platform?: string | null;
  trusted: boolean;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string | null;
}

export default function PairedDevicesPage() {
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/identity/paired-devices");
      if (res.ok) {
        const json = await res.json();
        setDevices(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const revoke = async (deviceId: string) => {
    setRevoking(deviceId);
    try {
      await apiFetch(`/identity/paired-devices/${deviceId}`, { method: "DELETE" });
      await load();
    } finally {
      setRevoking(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Paired SovPort Devices"
        description="Manage devices paired for biometric authentication and approvals."
      />
      <main className="p-6 space-y-4">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Trusted Devices</CardTitle>
            <CardDescription>
              Revoke access if a device is lost or no longer trusted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No paired devices yet. Pair SovPort from your device to see it here.
              </p>
            ) : (
              devices.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">
                      {d.name || d.platform || "SovPort Device"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Paired {new Date(d.createdAt).toLocaleString()} - Last seen{" "}
                      {new Date(d.lastSeenAt).toLocaleString()}
                    </div>
                    {d.revokedAt && (
                      <div className="text-xs text-destructive">Revoked</div>
                    )}
                  </div>
                  {!d.revokedAt && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => revoke(d.deviceId)}
                      disabled={revoking === d.deviceId}
                    >
                      {revoking === d.deviceId ? "Revoking..." : "Revoke"}
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
