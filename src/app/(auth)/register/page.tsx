import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Create account",
  description: "Start with SovGrant",
  path: "/register",
});

export default function Page() {
  return <StubPage title="Create account" description="Start with SovGrant" />;
}