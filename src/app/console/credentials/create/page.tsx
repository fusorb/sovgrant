import { buildMetadata } from "@/config/brand";
import { CreateCredentialView } from "./create-credential-view";

export const metadata = buildMetadata({
  title: "Issue credential",
  description: "Create a verifiable credential",
  path: "/console/credentials/create",
});

export default function Page() {
  return <CreateCredentialView />;
}