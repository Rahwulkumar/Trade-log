"use client";

import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your trading workspace and continue your review cycle."
      alternateHref="/auth/signup"
      alternateLabel="Need an account?"
      alternateCta="Create one"
    >
      <SignIn
        routing="hash"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-transparent shadow-none p-0",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton:
              "border border-border-subtle bg-surface-elevated hover:bg-muted text-foreground",
            formFieldInput:
              "bg-surface-elevated border-border-subtle text-foreground placeholder:text-muted-foreground",
            formButtonPrimary:
              "bg-accent-primary hover:bg-accent-primary/90 text-white",
            footerActionLink: "text-accent-primary hover:underline",
            dividerText: "text-muted-foreground",
            dividerLine: "bg-border-subtle",
          },
        }}
      />
    </AuthShell>
  );
}
