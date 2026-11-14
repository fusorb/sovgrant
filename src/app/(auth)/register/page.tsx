import { buildMetadata } from "@/config/brand";
import { RegisterView } from "./register-view";

export const metadata = buildMetadata({
  title: "Create account",
  description: "Start with SovGrant",
  path: "/register",
});

export default function Page() {
  return <RegisterView />;
}