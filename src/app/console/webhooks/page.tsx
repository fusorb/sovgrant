import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Webhooks",
  description: "Event delivery endpoints",
  path: "/console/webhooks",
});

export default function Page() {
  return <StubPage title="Webhooks" description="Event delivery endpoints" />;
}