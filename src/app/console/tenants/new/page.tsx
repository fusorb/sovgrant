import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "New workspace",
  description: "Create a tenant",
  path: "/console/tenants/new",
});

export default function Page() {
  return <StubPage title="New workspace" description="Create a tenant" />;
}