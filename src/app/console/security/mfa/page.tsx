import { buildMetadata } from "@/config/brand";
import { MfaView } from "./mfa-view";

export const metadata = buildMetadata({
  title: "Two-factor",
  description: "TOTP multi-factor authentication",
  path: "/console/security/mfa",
});

export default function Page() {
  return <MfaView />;
}