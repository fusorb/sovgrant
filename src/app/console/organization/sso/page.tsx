import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "SSO connections",
  description: "Enterprise identity providers",
  path: "/console/organization/sso",
});

export default function Page() {
  return <StubPage title="SSO connections" description="Enterprise identity providers" />;
}