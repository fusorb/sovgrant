import { buildMetadata } from "@/config/brand";
import { ForgotPasswordView } from "./forgot-password-view";

export const metadata = buildMetadata({
  title: "Forgot password",
  description: "Reset your password",
  path: "/forgot-password",
});

export default function Page() {
  return <ForgotPasswordView />;
}