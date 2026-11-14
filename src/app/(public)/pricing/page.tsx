import { buildMetadata } from "@/config/brand";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fusorb/facet-components";

export const metadata = buildMetadata({
  title: "Pricing",
  description: "Plans and limits",
  path: "/pricing",
});

export default function Page() {
  return (
    <section className="mx-auto max-w-4xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Pricing</h1>
        <p className="text-muted-foreground">Plans and limits for teams of any size.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">Free <Badge variant="secondary">Starter</Badge></CardTitle><CardDescription>Get started with core identity features.</CardDescription></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Basic tenant access and limits as configured for your deployment.</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">Pro <Badge>Growth</Badge></CardTitle><CardDescription>Higher limits and advanced capabilities.</CardDescription></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Expanded quotas, OAuth client management, and organization controls. See billing in the console for your current plan.</CardContent>
        </Card>
      </div>
    </section>
  );
}