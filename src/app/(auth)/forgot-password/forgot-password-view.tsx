"use client";

import { ForgotPasswordForm, useAuth } from "@fusorb/facet-auth";

export function ForgotPasswordView() {
  const { forgotPassword } = useAuth();
  return (
    <ForgotPasswordForm
      onSubmit={async (email) => {
        const res = await forgotPassword(email);
        const err = (res as any)?.error;
        return err ? (err.message || "Failed to request password reset.") : null;
      }}
    />
  );
}
