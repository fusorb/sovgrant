import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Credentials",
  description: "Verifiable credentials you hold and issue",
  path: "/console/credentials",
});

export default function Page() {
  return <StubPage title="Credentials" description="Verifiable credentials you hold and issue" />;
}