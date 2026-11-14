import { buildMetadata } from "@/config/brand";
import { IdentitiesView } from "./identities-view";

export const metadata = buildMetadata({
  title: "Identities",
  description: "People and entities in this tenant",
  path: "/console/identities",
});

export default function Page() {
  return <IdentitiesView />;
}