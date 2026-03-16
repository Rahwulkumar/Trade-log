"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * /auth/clear-session
 *
 * Navigating here signs the user out and clears all stale Clerk session
 * state (useful when JWT clock-skew causes an infinite redirect loop).
 * After sign-out the user is sent to /auth/login.
 */
export default function ClearSessionPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    signOut({ redirectUrl: "/auth/login" }).catch(() => {
      router.replace("/auth/login");
    });
  }, [signOut, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
        color: "var(--text-secondary, #888)",
        fontSize: "0.875rem",
      }}
    >
      Clearing session…
    </div>
  );
}
