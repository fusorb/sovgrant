import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Passkeys",
  description: "WebAuthn credentials",
  path: "/console/security/passkeys",
});

export default function Page() {
  return <StubPage title="Passkeys" description="WebAuthn credentials" />;
}