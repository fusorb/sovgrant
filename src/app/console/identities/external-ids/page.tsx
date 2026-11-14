import { buildMetadata } from "@/config/brand";
import { ExternalIdsView } from "./external-ids-view";

export const metadata = buildMetadata({
  title: "External identifiers",
  description: "Linked cross-system identifiers",
  path: "/console/identities/external-ids",
});

export default function Page() {
  return <ExternalIdsView />;
}