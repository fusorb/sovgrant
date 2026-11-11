import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "OAuth tokens",
  description: "Issued access tokens",
  path: "/console/oauth/tokens",
});

export default function Page() {
  return <StubPage title="OAuth tokens" description="Issued access tokens" />;
}