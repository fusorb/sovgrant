import { buildMetadata } from "@/config/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fusorb/facet-components";

export const metadata = buildMetadata({
  title: "Home",
  description: "Sovereign identity for the open web",
  path: "/home",
});

export default function Page() {
  return (
    <section className="mx-auto max-w-5xl space-y-8 py-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Passkeys & MFA</CardTitle><CardDescription>Strong, phishing-resistant sign-in.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Modern authentication with secure recovery and session controls.</CardContent></Card>
        <Card><CardHeader><CardTitle>Verifiable Credentials</CardTitle><CardDescription>Portable, SD-JWT based proofs.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Issue and verify credentials without sharing more data than needed.</CardContent></Card>
        <Card><CardHeader><CardTitle>OAuth2 / OIDC</CardTitle><CardDescription>Standards-based access.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Multi-tenant identity, policy, and consent for your applications.</CardContent></Card>
      </div>
    </section>
  );
}