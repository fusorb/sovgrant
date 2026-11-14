import { buildMetadata } from "@/config/brand";
import { SsoView } from "./sso-view";

export const metadata = buildMetadata({
  title: "SSO connections",
  description: "Enterprise identity providers",
  path: "/console/organization/sso",
});

export default function Page() {
  return <SsoView />;
}