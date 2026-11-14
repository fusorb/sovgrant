import { buildMetadata } from "@/config/brand";
import { LoginView } from "./login-view";

export const metadata = buildMetadata({
  title: "Sign in",
  description: "Access your SovGrant account",
  path: "/login",
});

export default function Page() {
  return <LoginView />;
}