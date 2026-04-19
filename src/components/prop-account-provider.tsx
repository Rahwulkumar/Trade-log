"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useAuth } from "@/components/auth-provider";
import { getActivePropAccounts } from "@/lib/api/client/prop-accounts";
import type { PropAccount } from "@/lib/db/schema";

const STORAGE_KEY = "trading-journal-selected-account";

interface PropAccountContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  propAccounts: PropAccount[];
  loading: boolean;
  /** Call after adding/editing an account so nav and sidebar update. */
  refreshPropAccounts: () => Promise<void>;
}

const PropAccountContext = createContext<PropAccountContextType | undefined>(
  undefined,
);

export function PropAccountProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [selectedAccountId, setSelectedAccountIdState] = useState<
    string | null
  >(null);
  const [propAccounts, setPropAccounts] = useState<PropAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const fetchedForUserRef = useRef<string | null>(null);

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
  const setSelectedAccountId = useCallback((id: string | null) => {
    setSelectedAccountIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id ?? "null");
    }
  }, []);

  const syncSelectionToAccounts = useCallback(
    (accounts: PropAccount[]) => {
      if (!selectedAccountId) return;
      const stillExists = accounts.some((account) => account.id === selectedAccountId);
      if (!stillExists) {
        setSelectedAccountId(null);
      }
    },
    [selectedAccountId, setSelectedAccountId],
  );

  const refreshPropAccounts = useCallback(async () => {
    if (!isConfigured || !userId) return;
    try {
      const accounts = await getActivePropAccounts();
      setPropAccounts(accounts);
      syncSelectionToAccounts(accounts);
      fetchedForUserRef.current = userId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Failed to fetch"))
        console.error("Failed to load prop accounts:", err);
    }
  }, [isConfigured, syncSelectionToAccounts, userId]);

  // Fetch active prop accounts — wait for auth to fully resolve first
  useEffect(() => {
    if (authLoading) return;
    if (!isConfigured || !userId) {
      fetchedForUserRef.current = null;
      setPropAccounts([]);
      setLoading(false);
      return;
    }

    async function loadAccounts() {
      try {
        setLoading(true);
        const accounts = await getActivePropAccounts();
        setPropAccounts(accounts);
        syncSelectionToAccounts(accounts);
        fetchedForUserRef.current = userId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Failed to fetch"))
          console.error("Failed to load prop accounts:", err);
      } finally {
        setLoading(false);
      }
    }

    if (initialized) {
      if (fetchedForUserRef.current === userId) {
        setLoading(false);
        return;
      }
      loadAccounts();
    }
  }, [authLoading, userId, isConfigured, initialized, syncSelectionToAccounts]);

  return (
    <PropAccountContext.Provider
      value={{
        selectedAccountId,
        setSelectedAccountId,
        propAccounts,
        loading,
        refreshPropAccounts,
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
