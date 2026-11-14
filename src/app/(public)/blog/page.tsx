import { buildMetadata } from "@/config/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fusorb/facet-components";

export const metadata = buildMetadata({
  title: "Blog",
  description: "Product and engineering notes",
  path: "/blog",
});

export default function Page() {
  return (
    <section className="mx-auto max-w-3xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Blog</h1>
        <p className="text-muted-foreground">Product and engineering notes.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Updates coming soon</CardTitle><CardDescription>We’re preparing posts on identity, security, and verifiable credentials.</CardDescription></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Check back for release notes and technical deep dives.</CardContent>
      </Card>
    </section>
  );
}