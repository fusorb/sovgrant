import { buildMetadata } from "@/config/brand";
import { VerifyEmailView } from "./verify-email-view";

export const metadata = buildMetadata({
  title: "Verify email",
  description: "Confirm your email address",
  path: "/verify-email",
});

export default function Page() {
  return <VerifyEmailView />;
}