import { buildMetadata } from "@/config/brand";
import { SigningKeysView } from "./signing-keys-view";

export const metadata = buildMetadata({
  title: "Signing keys",
  description: "Cryptographic keys used to sign",
  path: "/console/organization/signing-keys",
});

export default function Page() {
  return <SigningKeysView />;
}