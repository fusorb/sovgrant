import { buildMetadata } from "@/config/brand";
import { CredentialsView } from "./credentials-view";

export const metadata = buildMetadata({
  title: "Credentials",
  description: "Verifiable credentials you hold and issue",
  path: "/console/credentials",
});

export default function Page() {
  return <CredentialsView />;
}