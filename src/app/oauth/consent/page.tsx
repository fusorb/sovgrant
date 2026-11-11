import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Authorize application",
  description: "Review requested access",
  path: "/oauth/consent",
});

export default function Page() {
  return <StubPage title="Authorize application" description="Review requested access" />;
}