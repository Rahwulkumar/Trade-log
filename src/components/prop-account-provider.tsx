"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { getActivePropAccounts } from "@/lib/api/prop-accounts";
import type { PropAccount } from "@/lib/supabase/types";

const STORAGE_KEY = "trading-journal-selected-account";

interface PropAccountContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  propAccounts: PropAccount[];
  loading: boolean;
}

const PropAccountContext = createContext<PropAccountContextType | undefined>(undefined);

export function PropAccountProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(null);
  const [propAccounts, setPropAccounts] = useState<PropAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedAccountIdState(stored === "null" ? null : stored);
      }
      setInitialized(true);
    }
  }, []);

  // Persist to localStorage when selection changes
  const setSelectedAccountId = (id: string | null) => {
    setSelectedAccountIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id ?? "null");
    }
  };

  // Fetch active prop accounts
  useEffect(() => {
    async function loadAccounts() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        const accounts = await getActivePropAccounts();
        setPropAccounts(accounts);
      } catch (err) {
        console.error("Failed to load prop accounts:", err);
      } finally {
        setLoading(false);
      }
    }

    if (initialized) {
      loadAccounts();
    }
  }, [user, isConfigured, initialized]);

  return (
    <PropAccountContext.Provider
      value={{
        selectedAccountId,
        setSelectedAccountId,
        propAccounts,
        loading,
      }}
    >
      {children}
    </PropAccountContext.Provider>
  );
}

export function usePropAccount() {
  const context = useContext(PropAccountContext);
  if (context === undefined) {
    throw new Error("usePropAccount must be used within a PropAccountProvider");
  }
  return context;
}
