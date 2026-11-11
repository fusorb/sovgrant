import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "API keys",
  description: "Machine-to-machine credentials",
  path: "/console/api-keys",
});

export default function Page() {
  return <StubPage title="API keys" description="Machine-to-machine credentials" />;
}