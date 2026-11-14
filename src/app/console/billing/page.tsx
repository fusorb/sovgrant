import { buildMetadata } from "@/config/brand";
import { BillingView } from "./billing-view";

export const metadata = buildMetadata({
  title: "Billing",
  description: "Subscription and plan",
  path: "/console/billing",
});

export default function Page() {
  return <BillingView />;
}