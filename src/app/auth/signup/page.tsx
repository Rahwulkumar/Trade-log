"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

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
