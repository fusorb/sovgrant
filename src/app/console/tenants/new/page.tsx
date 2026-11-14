import { buildMetadata } from "@/config/brand";
import { NewTenantView } from "./new-tenant-view";

export const metadata = buildMetadata({
  title: "New workspace",
  description: "Create a tenant",
  path: "/console/tenants/new",
});

export default function Page() {
  return <NewTenantView />;
}