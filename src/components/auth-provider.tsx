"use client";

import { createContext, useContext, ReactNode } from "react";
import { useUser, useClerk } from "@clerk/nextjs";

interface ClerkUser {
  id: string;
  email: string | undefined;
  fullName: string | null | undefined;
  imageUrl: string;
}

interface AuthContextType {
  // Clerk-native fields
  userId: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;

  // Backward-compatible aliases (so 18+ existing components compile unchanged)
  user: ClerkUser | null;
  loading: boolean;
  isConfigured: boolean;
  profile: {
    full_name: string | null | undefined;
    avatar_url: string;
    first_name: string | null;
    last_name: string | null;
    timezone: string | null;
    default_risk_percent: number | null;
    default_rr_ratio: number | null;
  } | null;
  refreshProfile: () => Promise<void>;
  session: null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inner component — must be inside <ClerkProvider> in the tree
function ClerkAuthConsumer({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  return (
    <AuthContext.Provider
      value={{
        userId: user?.id ?? null,
        isLoaded,
        isSignedIn: isSignedIn ?? false,
        signOut: async () => {
          await clerkSignOut();
        },

        // Backward-compat aliases
        user: user
          ? {
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              fullName: user.fullName,
              imageUrl: user.imageUrl,
            }
          : null,
        loading: !isLoaded,
        isConfigured: true,
        profile: user
          ? {
              full_name: user.fullName,
              avatar_url: user.imageUrl,
              first_name: user.firstName ?? null,
              last_name: user.lastName ?? null,
              timezone: null,
              default_risk_percent: null,
              default_rr_ratio: null,
            }
          : null,
        refreshProfile: async () => {}, // Clerk auto-refreshes
        session: null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Fallback for when Clerk is not configured (no keys set yet)
function FallbackAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        userId: null,
        isLoaded: true,
        isSignedIn: false,
        signOut: async () => {},
        user: null,
        loading: false,
        isConfigured: false,
        profile: null,
        refreshProfile: async () => {},
        session: null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// This is exported and used in layout.tsx
// layout.tsx wraps it with <ClerkProvider> only when keys are set.
// When ClerkProvider IS in the tree → ClerkAuthConsumer works fine.
// When ClerkProvider is NOT in the tree → FallbackAuthProvider is used.
export function AuthProvider({
  children,
  clerkConfigured = false,
}: {
  children: ReactNode;
  clerkConfigured?: boolean;
}) {
  if (!clerkConfigured) {
    return <FallbackAuthProvider>{children}</FallbackAuthProvider>;
  }
  return <ClerkAuthConsumer>{children}</ClerkAuthConsumer>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
