import { buildMetadata } from "@/config/brand";
import { MfaView } from "./mfa-view";

export const metadata = buildMetadata({
  title: "Two-factor authentication",
  description: "Complete your verification",
  path: "/mfa",
});

export default function Page() {
  return <MfaView />;
}