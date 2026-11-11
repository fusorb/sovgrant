import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "OAuth applications",
  description: "Registered OAuth clients",
  path: "/console/oauth/applications",
});

export default function Page() {
  return <StubPage title="OAuth applications" description="Registered OAuth clients" />;
}