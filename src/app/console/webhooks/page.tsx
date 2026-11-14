import { buildMetadata } from "@/config/brand";
import { WebhooksView } from "./webhooks-view";

export const metadata = buildMetadata({
  title: "Webhooks",
  description: "Event delivery endpoints",
  path: "/console/webhooks",
});

export default function Page() {
  return <WebhooksView />;
}