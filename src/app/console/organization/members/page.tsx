import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Members",
  description: "Who belongs to this workspace",
  path: "/console/organization/members",
});

export default function Page() {
  return <StubPage title="Members" description="Who belongs to this workspace" />;
}