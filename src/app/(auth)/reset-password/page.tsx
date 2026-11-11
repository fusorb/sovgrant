import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Reset password",
  description: "Choose a new password",
  path: "/reset-password",
});

export default function Page() {
  return <StubPage title="Reset password" description="Choose a new password" />;
}