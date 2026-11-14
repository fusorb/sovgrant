import { buildMetadata } from "@/config/brand";
import { PoliciesView } from "./policies-view";

export const metadata = buildMetadata({
  title: "Policies",
  description: "Tenant policy and enforcement",
  path: "/console/organization/policies",
});

export default function Page() {
  return <PoliciesView />;
}