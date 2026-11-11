import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Home",
  description: "Sovereign identity for the open web",
  path: "/home",
});

export default function Page() {
  return <StubPage title="Home" description="Sovereign identity for the open web" />;
}