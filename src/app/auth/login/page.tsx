"use client";

import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { authClerkAppearance } from "@/components/auth/clerk-appearance";

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your trading workspace and continue your review cycle."
    >
      <SignIn
        routing="hash"
        fallbackRedirectUrl="/dashboard"
        appearance={authClerkAppearance}
      />
    </AuthShell>
  );
}
