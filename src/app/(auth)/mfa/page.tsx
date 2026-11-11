import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Two-factor authentication",
  description: "Complete your verification",
  path: "/mfa",
});

export default function Page() {
  return <StubPage title="Two-factor authentication" description="Complete your verification" />;
}