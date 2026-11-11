import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Devices",
  description: "Registered devices",
  path: "/console/security/devices",
});

export default function Page() {
  return <StubPage title="Devices" description="Registered devices" />;
}