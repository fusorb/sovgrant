import { buildMetadata } from "@/config/brand";
import { MembersView } from "./members-view";

export const metadata = buildMetadata({
  title: "Members",
  description: "Who belongs to this workspace",
  path: "/console/organization/members",
});

export default function Page() {
  return <MembersView />;
}