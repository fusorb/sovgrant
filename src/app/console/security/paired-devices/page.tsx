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
  EmptyState,
} from "@fusorb/facet-components";
import { usePairedDevices } from "@/hooks/use-paired-devices";

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
  const { list, revoke } = usePairedDevices();
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await list();
      setDevices(res?.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRevoke = async (deviceId: string) => {
    setRevoking(deviceId);
    try {
      await revoke(deviceId);
      await load();
    } finally {
      setRevoking(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Paired SovPort Devices"
        description="Paired SovPort devices trusted to approve a sign-in with biometrics."
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
              <EmptyState
                title="No paired devices"
                description="Pair a SovPort app to use it for biometric approvals."
              />
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
                      onClick={() => onRevoke(d.deviceId)}
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
