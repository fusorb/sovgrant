import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Account",
  description: "Profile, security, and password",
  path: "/console/user",
});

export default function Page() {
  return <StubPage title="Account" description="Profile, security, and password" />;
}