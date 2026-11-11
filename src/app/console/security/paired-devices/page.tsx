import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Paired devices",
  description: "Devices paired for approvals",
  path: "/console/security/paired-devices",
});

export default function Page() {
  return <StubPage title="Paired devices" description="Devices paired for approvals" />;
}