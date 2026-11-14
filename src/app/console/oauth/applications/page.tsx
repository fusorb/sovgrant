import { buildMetadata } from "@/config/brand";
import { ApplicationsView } from "./applications-view";

export const metadata = buildMetadata({
  title: "OAuth applications",
  description: "Registered OAuth clients",
  path: "/console/oauth/applications",
});

export default function Page() {
  return <ApplicationsView />;
}