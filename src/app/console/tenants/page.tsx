import { buildMetadata } from "@/config/brand";
import { TenantsView } from "./tenants-view";

export const metadata = buildMetadata({
  title: "Tenants",
  description: "Workspaces you belong to",
  path: "/console/tenants",
});

export default function Page() {
  return <TenantsView />;
}