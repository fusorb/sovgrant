import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Projects",
  description: "Group resources under a project",
  path: "/console/organization/projects",
});

export default function Page() {
  return <StubPage title="Projects" description="Group resources under a project" />;
}