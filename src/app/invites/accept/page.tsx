import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Accept invitation",
  description: "Join a workspace",
  path: "/invites/accept",
});

export default function Page() {
  return <StubPage title="Accept invitation" description="Join a workspace" />;
}