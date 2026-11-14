"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@fusorb/facet-components";

// MFA challenges are completed as part of the sign-in flow.
export function MfaView() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>Complete verification during sign-in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">If you were prompted for a code, return to sign-in to complete verification.</p>
        <Button asChild><Link href="/login">Back to sign in</Link></Button>
      </CardContent>
    </Card>
  );
}
