import { buildMetadata } from "@/config/brand";
import { StubPage } from "@/components/stub-page";

export const metadata = buildMetadata({
  title: "Blog",
  description: "Product and engineering notes",
  path: "/blog",
});

export default function Page() {
  return <StubPage title="Blog" description="Product and engineering notes" />;
}