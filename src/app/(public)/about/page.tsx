import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "About",
  description: "Why SovGrant exists",
  path: "/about",
});

export default function Page() {
  return <StubPage title="About" description="Why SovGrant exists" />;
}