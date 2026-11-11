"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, GradientText } from "@fusorb/facet-components";

/**
 * Landing hero - rendered only on /home so the other public pages keep a
 * clean content top.
 *
 * Copy stays truthful and canonical to what the system actually does
 * (SD-JWT Verifiable Credentials, passkeys, OAuth2/OIDC, non-custodial
 * identity) - no invented claims.
 */
export function ConditionalHero() {
  const pathname = usePathname();
  if (pathname !== "/home") return null;

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 py-20 text-center">
      <h1 className="text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        One identity, <GradientText text="trusted everywhere." />
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Sovereign, verifiable identity for people and organisations - passkeys
        instead of passwords, Verifiable Credentials instead of PDFs, and
        multi-tenant OAuth2/OIDC underneath it all.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/register">Begin your journey</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/console">Open the console</Link>
        </Button>
      </div>
    </section>
  );
}
