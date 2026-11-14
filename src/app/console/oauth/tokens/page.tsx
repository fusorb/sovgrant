import { buildMetadata } from "@/config/brand";
import { TokensView } from "./tokens-view";

export const metadata = buildMetadata({
  title: "OAuth tokens",
  description: "Issued access tokens",
  path: "/console/oauth/tokens",
});

export default function Page() {
  return <TokensView />;
}