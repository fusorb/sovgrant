import { buildMetadata } from "@/config/brand";
import { ResetPasswordView } from "./reset-password-view";

export const metadata = buildMetadata({
  title: "Reset password",
  description: "Choose a new password",
  path: "/reset-password",
});

export default function Page() {
  return <ResetPasswordView />;
}