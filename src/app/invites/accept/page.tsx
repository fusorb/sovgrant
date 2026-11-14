import { Suspense } from "react";
import { buildMetadata } from "@/config/brand";
import { AcceptInviteView } from "./accept-invite-view";

export const metadata = buildMetadata({
  title: "Accept invitation",
  description: "Join a workspace",
  path: "/invites/accept",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteView />
    </Suspense>
  );
}