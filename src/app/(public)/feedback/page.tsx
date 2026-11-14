import { buildMetadata } from "@/config/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fusorb/facet-components";

export const metadata = buildMetadata({
  title: "Feedback",
  description: "Tell us what to build next",
  path: "/feedback",
});

export default function Page() {
  return (
    <section className="mx-auto max-w-3xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">Tell us what to build next.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>We value your input</CardTitle><CardDescription>Help shape SovGrant.</CardDescription></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Share feature requests, issues, or integration needs with your workspace administrators or support channel.</CardContent>
      </Card>
    </section>
  );
}