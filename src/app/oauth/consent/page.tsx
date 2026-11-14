import { Suspense } from "react";
import { buildMetadata } from "@/config/brand";
import { ConsentView } from "./consent-view";

export const metadata = buildMetadata({
  title: "Authorize application",
  description: "Review requested access",
  path: "/oauth/consent",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ConsentView />
    </Suspense>
  );
}