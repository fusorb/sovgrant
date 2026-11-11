import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Pricing",
  description: "Plans and limits",
  path: "/pricing",
});

export default function Page() {
  return <StubPage title="Pricing" description="Plans and limits" />;
}