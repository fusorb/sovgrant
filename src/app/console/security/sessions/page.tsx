import { buildMetadata } from "@/config/brand";
import { SessionsView } from "./sessions-view";

export const metadata = buildMetadata({
  title: "Sessions",
  description: "Active authenticated sessions",
  path: "/console/security/sessions",
});

export default function Page() {
  return <SessionsView />;
}