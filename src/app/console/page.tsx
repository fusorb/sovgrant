import { buildMetadata } from "@/config/brand";
import { ConsoleDashboardView } from "./console-dashboard-view";

export const metadata = buildMetadata({
  title: "Dashboard",
  description: "Overview of your workspace",
  path: "/console",
});

export default function Page() {
  return <ConsoleDashboardView />;
}