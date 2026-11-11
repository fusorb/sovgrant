import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Audit log",
  description: "Security and access events",
  path: "/console/security/audit",
});

export default function Page() {
  return <StubPage title="Audit log" description="Security and access events" />;
}