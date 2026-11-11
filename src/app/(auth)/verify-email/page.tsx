import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Verify email",
  description: "Confirm your email address",
  path: "/verify-email",
});

export default function Page() {
  return <StubPage title="Verify email" description="Confirm your email address" />;
}