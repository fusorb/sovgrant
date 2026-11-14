import { buildMetadata } from "@/config/brand";
import { ApiKeysView } from "./api-keys-view";

export const metadata = buildMetadata({
  title: "API keys",
  description: "Machine-to-machine credentials",
  path: "/console/api-keys",
});

export default function Page() {
  return <ApiKeysView />;
}