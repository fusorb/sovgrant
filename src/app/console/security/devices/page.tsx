import { buildMetadata } from "@/config/brand";
import { DevicesView } from "./devices-view";

export const metadata = buildMetadata({
  title: "Devices",
  description: "Registered devices",
  path: "/console/security/devices",
});

export default function Page() {
  return <DevicesView />;
}