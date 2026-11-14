"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fusorb/facet-components";
import { ResetPasswordForm, useAuth } from "@fusorb/facet-auth";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPassword } = useAuth();
  const token = searchParams.get("token") || "";

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Reset password</CardTitle><CardDescription>Invalid or missing reset link.</CardDescription></CardHeader>
        <CardContent>
          <Alert variant="destructive"><AlertTitle>Missing token</AlertTitle><AlertDescription>Use the password reset link sent to your email.</AlertDescription></Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <ResetPasswordForm
      token={token}
      onSubmit={async (t, newPassword) => {
        const res = await resetPassword(t, newPassword);
        const err = (res as any)?.error;
        return err ? (err.message || "Failed to reset password.") : null;
      }}
      onSuccess={() => router.push("/login")}
    />
  );
}

export function ResetPasswordView() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
