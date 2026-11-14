import { buildMetadata } from "@/config/brand";
import { DidView } from "./did-view";

export const metadata = buildMetadata({
  title: "DID",
  description: "did:web identity for this tenant",
  path: "/console/organization/did",
});

export default function Page() {
  return <DidView />;
}