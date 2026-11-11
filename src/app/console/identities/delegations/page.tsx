import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Delegations",
  description: "Scoped access granted to others",
  path: "/console/identities/delegations",
});

export default function Page() {
  return <StubPage title="Delegations" description="Scoped access granted to others" />;
}