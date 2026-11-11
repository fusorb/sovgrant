import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "DID",
  description: "did:web identity for this tenant",
  path: "/console/organization/did",
});

export default function Page() {
  return <StubPage title="DID" description="did:web identity for this tenant" />;
}