import { buildMetadata } from "@/config/brand";
import { AuditView } from "./audit-view";

export const metadata = buildMetadata({
  title: "Audit log",
  description: "Security and access events",
  path: "/console/security/audit",
});

export default function Page() {
  return <AuditView />;
}