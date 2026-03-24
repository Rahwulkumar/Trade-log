"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { PulseLoader } from "@/components/ui/loading";
import { AppPanelEmptyState } from "@/components/ui/page-primitives";

export default function ClearSessionPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    signOut({ redirectUrl: "/auth/login" }).catch(() => {
      router.replace("/auth/login");
    });
  }, [signOut, router]);

  return (
    <div className="min-h-screen" style={{ background: "var(--app-bg)" }}>
      <PageShell className="flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-xl">
          <AppPanelEmptyState
            title="Clearing session"
            description="Signing you out and resetting stale authentication state now."
            minHeight={260}
            action={
              <div className="flex flex-col items-center gap-4">
                <PulseLoader />
                <Button asChild variant="outline">
                  <Link href="/auth/login">Back to sign in</Link>
                </Button>
              </div>
            }
          />
        </div>
      </PageShell>
    </div>
  );
}
