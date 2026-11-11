import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Signing keys",
  description: "Cryptographic keys used to sign",
  path: "/console/organization/signing-keys",
});

export default function Page() {
  return <StubPage title="Signing keys" description="Cryptographic keys used to sign" />;
}