import { buildMetadata } from "@/config/brand";
import { ProjectsView } from "./projects-view";

export const metadata = buildMetadata({
  title: "Projects",
  description: "Group resources under a project",
  path: "/console/organization/projects",
});

export default function Page() {
  return <ProjectsView />;
}