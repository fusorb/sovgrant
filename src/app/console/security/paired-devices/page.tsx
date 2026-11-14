import { buildMetadata } from "@/config/brand";
import { PairedDevicesView } from "./paired-devices-view";

export const metadata = buildMetadata({
  title: "Paired devices",
  description: "Devices paired for approvals",
  path: "/console/security/paired-devices",
});

export default function Page() {
  return <PairedDevicesView />;
}