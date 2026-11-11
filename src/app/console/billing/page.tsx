import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Billing",
  description: "Subscription and plan",
  path: "/console/billing",
});

export default function Page() {
  return <StubPage title="Billing" description="Subscription and plan" />;
}