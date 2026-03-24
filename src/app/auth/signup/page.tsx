"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { authClerkAppearance } from "@/components/auth/clerk-appearance";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Set up your workspace and start logging your trading execution."
      alternateHref="/auth/login"
      alternateLabel="Already have an account?"
      alternateCta="Sign in"
    >
      <SignUp
        routing="hash"
        fallbackRedirectUrl="/dashboard"
        appearance={authClerkAppearance}
      />
    </AuthShell>
  );
}
