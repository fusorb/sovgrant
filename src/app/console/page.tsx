import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Dashboard",
  description: "Overview of your workspace",
  path: "/console",
});

export default function Page() {
  return <StubPage title="Dashboard" description="Overview of your workspace" />;
}