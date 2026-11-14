import { buildMetadata } from "@/config/brand";
import { PasskeysView } from "./passkeys-view";

export const metadata = buildMetadata({
  title: "Passkeys",
  description: "WebAuthn credentials",
  path: "/console/security/passkeys",
});

export default function Page() {
  return <PasskeysView />;
}