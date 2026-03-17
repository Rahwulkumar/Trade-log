"use client";

import { createContext, useContext, ReactNode, useEffect, useMemo, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { getCurrentUserProfile } from "@/lib/api/client/profile";
import {
  DEFAULT_APP_RISK_PERCENT,
  DEFAULT_APP_RR_RATIO,
  DEFAULT_APP_TIMEFRAME,
  DEFAULT_APP_TIMEZONE,
  type AppUserProfile,
} from "@/lib/types/app-user-profile";

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
  profile: AppUserProfile | null;
  refreshProfile: () => Promise<void>;
  session: null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildFallbackProfile(user: {
  id: string;
  primaryEmailAddress?: { emailAddress: string } | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl: string;
} | null | undefined): AppUserProfile | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    full_name: user.fullName ?? null,
    first_name: user.firstName ?? null,
    last_name: user.lastName ?? null,
    avatar_url: user.imageUrl ?? null,
    timezone: DEFAULT_APP_TIMEZONE,
    default_risk_percent: DEFAULT_APP_RISK_PERCENT,
    default_rr_ratio: DEFAULT_APP_RR_RATIO,
    default_timeframe: DEFAULT_APP_TIMEFRAME,
    created_at: null,
    updated_at: null,
  };
}

// Inner component — must be inside <ClerkProvider> in the tree
function ClerkAuthConsumer({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [remoteProfile, setRemoteProfile] = useState<AppUserProfile | null>(null);
  const userId = user?.id ?? null;
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const userFullName = user?.fullName ?? null;
  const userFirstName = user?.firstName ?? null;
  const userLastName = user?.lastName ?? null;
  const userImageUrl = user?.imageUrl ?? null;

  async function refreshProfile() {
    if (!userId) {
      setRemoteProfile(null);
      return;
    }

    const syncedProfile = await getCurrentUserProfile();
    setRemoteProfile(syncedProfile);
  }

  useEffect(() => {
    if (!isLoaded || !userId) return;

    let cancelled = false;
    void (async () => {
      const syncedProfile = await getCurrentUserProfile();
      if (!cancelled && syncedProfile?.id === userId) {
        setRemoteProfile(syncedProfile);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    userId,
  ]);

  const profile = useMemo(() => {
    const fallback = buildFallbackProfile(
      userId
        ? {
            id: userId,
            primaryEmailAddress: userEmail ? { emailAddress: userEmail } : null,
            fullName: userFullName,
            firstName: userFirstName,
            lastName: userLastName,
            imageUrl: userImageUrl ?? "",
          }
        : null,
    );
    if (!fallback) return null;
    if (!remoteProfile || remoteProfile.id !== fallback.id) {
      return fallback;
    }

    return {
      ...fallback,
      ...remoteProfile,
      email: remoteProfile.email ?? fallback.email,
      full_name: remoteProfile.full_name ?? fallback.full_name,
      avatar_url: remoteProfile.avatar_url ?? fallback.avatar_url,
    };
  }, [remoteProfile, userEmail, userFirstName, userFullName, userId, userImageUrl, userLastName]);

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
        profile,
        refreshProfile,
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
