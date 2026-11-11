import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Feedback",
  description: "Tell us what to build next",
  path: "/feedback",
});

export default function Page() {
  return <StubPage title="Feedback" description="Tell us what to build next" />;
}