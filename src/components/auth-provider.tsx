"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/lib/supabase/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if Supabase is configured
function isSupabaseConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if Supabase is configured
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);
    console.log("[Auth] Supabase configured:", configured);
    
    if (!configured) {
      setLoading(false);
      return;
    }

    // Only import and use Supabase if configured
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      console.log("[Auth] Supabase client created");

      async function fetchProfile(userId: string) {
        console.log("[Auth] Fetching profile for user:", userId);
        try {
          // Add a 3-second timeout to prevent hanging
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error("Profile fetch timeout")), 3000)
          );
          
          const fetchPromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          const result = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (result && 'data' in result) {
            const { data, error } = result;
            if (error) {
              console.log("[Auth] Profile fetch error (this is OK):", error.message);
            } else {
              console.log("[Auth] Profile fetched:", data);
            }
            setProfile(data as Profile | null);
          }
        } catch (err: unknown) {
          // Profile fetch is optional - don't block on failure
          console.log("[Auth] Profile fetch skipped:", err instanceof Error ? err.message : "Unknown error");
          setProfile(null);
        }
      }

      // Get initial session
      console.log("[Auth] Getting initial session...");
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        console.log("[Auth] Session result:", session ? "Session exists" : "No session", error ? `Error: ${error.message}` : "");
        console.log("[Auth] User from session:", session?.user?.id || "none");
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        }
        setLoading(false);
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("[Auth] Auth state changed:", event, session?.user?.id || "no user");
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    });
  }, []);

  async function signOut() {
    if (!isConfigured) return;
    
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }

  async function refreshProfile() {
    if (!isConfigured || !user) return;
    
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(data as Profile | null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isConfigured, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
