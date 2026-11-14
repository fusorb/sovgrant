import { buildMetadata } from "@/config/brand";
import { OrganizationView } from "./organization-view";

export const metadata = buildMetadata({
  title: "Organization",
  description: "Workspace overview and settings",
  path: "/console/organization",
});

export default function Page() {
  return <OrganizationView />;
}