import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Organization",
  description: "Workspace overview and settings",
  path: "/console/organization",
});

export default function Page() {
  return <StubPage title="Organization" description="Workspace overview and settings" />;
}