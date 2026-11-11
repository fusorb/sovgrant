import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Forgot password",
  description: "Reset your password",
  path: "/forgot-password",
});

export default function Page() {
  return <StubPage title="Forgot password" description="Reset your password" />;
}