import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "External identifiers",
  description: "Linked cross-system identifiers",
  path: "/console/identities/external-ids",
});

export default function Page() {
  return <StubPage title="External identifiers" description="Linked cross-system identifiers" />;
}