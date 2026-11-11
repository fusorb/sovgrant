import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Issue credential",
  description: "Create a verifiable credential",
  path: "/console/credentials/create",
});

export default function Page() {
  return <StubPage title="Issue credential" description="Create a verifiable credential" />;
}