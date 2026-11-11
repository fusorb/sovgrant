import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Sign in",
  description: "Access your SovGrant account",
  path: "/login",
});

export default function Page() {
  return <StubPage title="Sign in" description="Access your SovGrant account" />;
}