import { buildMetadata } from "@/config/brand";
import { UserView } from "./user-view";

export const metadata = buildMetadata({
  title: "Account",
  description: "Profile, security, and password",
  path: "/console/user",
});

export default function Page() {
  return <UserView />;
}