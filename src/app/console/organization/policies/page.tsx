import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Policies",
  description: "Tenant policy and enforcement",
  path: "/console/organization/policies",
});

export default function Page() {
  return <StubPage title="Policies" description="Tenant policy and enforcement" />;
}