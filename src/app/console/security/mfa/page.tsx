import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Two-factor",
  description: "TOTP multi-factor authentication",
  path: "/console/security/mfa",
});

export default function Page() {
  return <StubPage title="Two-factor" description="TOTP multi-factor authentication" />;
}