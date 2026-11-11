import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Tenants",
  description: "Workspaces you belong to",
  path: "/console/tenants",
});

export default function Page() {
  return <StubPage title="Tenants" description="Workspaces you belong to" />;
}