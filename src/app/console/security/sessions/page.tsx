import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Sessions",
  description: "Active authenticated sessions",
  path: "/console/security/sessions",
});

export default function Page() {
  return <StubPage title="Sessions" description="Active authenticated sessions" />;
}