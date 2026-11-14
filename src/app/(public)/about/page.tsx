import { buildMetadata } from "@/config/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fusorb/facet-components";

export const metadata = buildMetadata({
  title: "About",
  description: "Why SovGrant exists",
  path: "/about",
});

export default function Page() {
  return (
    <section className="mx-auto max-w-3xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Why SovGrant exists</h1>
        <p className="text-muted-foreground">Sovereign, verifiable identity for people and organisations — built on open standards, not lock-in.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>What we provide</CardTitle>
          <CardDescription>Identity and access primitives you can trust.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Passkeys and MFA instead of fragile passwords. OAuth2/OIDC, SD-JWT Verifiable Credentials, and did:web for portable, verifiable identity.</p>
          <p>Multi-tenant controls, policy enforcement, and auditable security events — so applications can verify users without owning their identity.</p>
        </CardContent>
      </Card>
    </section>
  );
}