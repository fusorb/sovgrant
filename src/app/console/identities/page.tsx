import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Identities",
  description: "People and entities in this tenant",
  path: "/console/identities",
});

export default function Page() {
  return <StubPage title="Identities" description="People and entities in this tenant" />;
}