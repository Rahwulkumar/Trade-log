"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import {
  getPropAccounts,
  // createPropAccount removed
  deletePropAccount,
  checkCompliance,
  recalculateBalanceFromTrades,
  type ComplianceStatus,
} from "@/lib/api/client/prop-accounts";

import {
  Plus,
  Trash2,
  Loader2,
  Zap,
  Calendar,
  BarChart3,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Cloud,
} from "lucide-react";
import {
  enableAutoSync,
  getTerminalStatusByPropAccount,
  disableAutoSync,
  createMT5Account,
  getMT5Accounts,
  resetMt5SyncByPropAccount,
  type TerminalStatusByPropAccountResult,
} from "@/lib/api/terminal-farm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PropAccount as DrizzlePropAccount } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

// Bridge type: adds Supabase-compatible snake_case aliases for the Drizzle PropAccount
// so the existing UI code doesn't need a mass rename.
type PropAccount = DrizzlePropAccount & {
  name?: string; // alias for accountName
  firm?: string; // alias for firmName
  phase?: string; // no direct equivalent — from challenge
  initial_balance: number; // populated by normalizeAccount from accountSize
  current_balance: number; // populated by normalizeAccount from currentBalance
  daily_dd_max?: number | null;
  daily_dd_current?: number | null;
  total_dd_max?: number | null;
  total_dd_current?: number | null;
  profit_target?: number | null;
  start_date?: string | null;
};

/** Populate snake_case aliases from Drizzle camelCase fields so the rest of the UI works unchanged */
function normalizeAccount(a: DrizzlePropAccount): PropAccount {
  return {
    ...a,
    name: a.accountName,
    firm: a.firmName ?? undefined,
    phase: a.currentPhaseStatus ?? undefined,
    initial_balance: Number(a.accountSize ?? 0),
    current_balance: Number(a.currentBalance ?? 0),
    start_date: a.startDate ?? null,
  };
}

type PropAccountWithCompliance = PropAccount & { compliance: ComplianceStatus };

// Helper: Convert dollar amount to percentage of initial balance
// The database stores daily_dd_max, total_dd_max, profit_target as dollar amounts
// but we need to display them as percentages
function toPercent(
  dollarAmount: number | null | undefined,
  initialBalance: number,
): number {
  if (!dollarAmount || !initialBalance || initialBalance === 0) return 0;
  return (dollarAmount / initialBalance) * 100;
}

export default function PropFirmPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId, setSelectedAccountId, refreshPropAccounts } = usePropAccount();
  const [accounts, setAccounts] = useState<PropAccountWithCompliance[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<PropAccountWithCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  // Terminal Farm State (includes stored MT5 account so we can show "using your details")
  const [terminalStatus, setTerminalStatus] = useState<{
    connected: boolean;
    terminal: TerminalStatusByPropAccountResult["terminal"];
    mt5AccountId?: string;
    mt5Account?: TerminalStatusByPropAccountResult["mt5Account"];
    diagnostics: TerminalStatusByPropAccountResult["diagnostics"];
    livePositions: TerminalStatusByPropAccountResult["livePositions"];
  } | null>(null);
  const lastTerminalSyncKeyRef = useRef<string | null>(null);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [mt5FormData, setMt5FormData] = useState({
    server: "",
    login: "",
    password: "",
    currentBalance: "",
  });
  const [mt5Error, setMt5Error] = useState<string | null>(null);

  // Single Add Account form: firm name, phase type, start date, optional starting balance
  const [addForm, setAddForm] = useState({
    firmName: "",
    phaseType: "2-phase" as "2-phase" | "1-phase" | "zero-phase",
    startDate: new Date().toISOString().split("T")[0],
    startingBalance: "",
  });

  const loadAccounts = useCallback(async () => {
    if (!isConfigured || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const accountsData = await getPropAccounts();
      const mt5Accounts = await getMT5Accounts();
      const mt5LinkedPropAccountIds = new Set(
        mt5Accounts
          .map((a) => a.propAccountId)
          .filter((id): id is string => Boolean(id)),
      );

      // Recalculate only non-MT5 accounts from trades.
      // MT5-linked accounts should keep live balance from terminal heartbeat.
      const nonMt5Accounts = accountsData.filter(
        (account) => !mt5LinkedPropAccountIds.has(account.id),
      );
      if (nonMt5Accounts.length > 0) {
        await Promise.all(
          nonMt5Accounts.map((account) =>
            recalculateBalanceFromTrades(account.id),
          ),
        );
      }

      // Refetch after any recalculation
      const updatedAccountsData =
        nonMt5Accounts.length > 0 ? await getPropAccounts() : accountsData;

      // Get compliance for each account
      const accountsWithCompliance = await Promise.all(
        updatedAccountsData.map(async (account) => {
          const compliance = await checkCompliance(account.id);
          return {
            ...normalizeAccount(account),
            compliance,
          } as PropAccountWithCompliance;
        }),
      );

      setAccounts(accountsWithCompliance);

      // Determine which account to show based on global selection or default to first
      if (selectedAccountId && selectedAccountId !== "unassigned") {
        const found = accountsWithCompliance.find(
          (a) => a.id === selectedAccountId,
        );
        if (found) setSelectedAccount(found);
        else if (accountsWithCompliance.length > 0)
          setSelectedAccount(accountsWithCompliance[0]);
      } else if (accountsWithCompliance.length > 0 && !selectedAccountId) {
        setSelectedAccount(accountsWithCompliance[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [isConfigured, user, selectedAccountId]);
  const selectedAccountKey = selectedAccount?.id ?? null;

  const mapTerminalStatus = useCallback(
    (result: TerminalStatusByPropAccountResult) => ({
      connected: result.connected,
      terminal: result.terminal,
      mt5AccountId: result.mt5AccountId,
      mt5Account: result.mt5Account,
      diagnostics: result.diagnostics,
      livePositions: result.livePositions,
    }),
    [],
  );

  const getTerminalSyncKey = useCallback(
    (result: TerminalStatusByPropAccountResult) =>
      [
        result.terminal?.terminalId ?? "",
        result.terminal?.status ?? "",
        result.terminal?.lastHeartbeat ?? "",
        result.terminal?.lastSyncAt ?? "",
        result.mt5Account?.balance ?? "",
        result.mt5Account?.equity ?? "",
        result.diagnostics?.code ?? "",
        result.diagnostics?.lastTradeImportCount ?? "",
        result.diagnostics?.lastTradeSkipCount ?? "",
        result.livePositions.length,
      ].join("|"),
    [],
  );

  const refreshTerminalStatus = useCallback(
    async (
      propAccountId: string,
      options?: { reloadAccountsOnChange?: boolean },
    ) => {
      const result = await getTerminalStatusByPropAccount(propAccountId);
      setTerminalStatus(mapTerminalStatus(result));

      if (options?.reloadAccountsOnChange) {
        const syncKey = getTerminalSyncKey(result);
        if (syncKey !== lastTerminalSyncKeyRef.current) {
          lastTerminalSyncKeyRef.current = syncKey;
          await loadAccounts();
        }
      }

      return result;
    },
    [getTerminalSyncKey, loadAccounts, mapTerminalStatus],
  );

  // Update selected account when global ID changes
  useEffect(() => {
    if (accounts.length > 0) {
      if (selectedAccountId && selectedAccountId !== "unassigned") {
        const found = accounts.find((a) => a.id === selectedAccountId);
        if (found) {
          setSelectedAccount(found);
        }
      } else {
        setSelectedAccount(null);
      }
    }
  }, [selectedAccountId, accounts]);

  useEffect(() => {
    if (!authLoading) {
      loadAccounts();
    }
  }, [user, isConfigured, authLoading, loadAccounts]);

  // Fetch terminal/sync status when selected account changes so UI shows Synced / Not synced
  useEffect(() => {
    if (!selectedAccountKey) {
      setTerminalStatus(null);
      return;
    }
    refreshTerminalStatus(selectedAccountKey)
      .catch(() =>
        setTerminalStatus({
          connected: false,
          terminal: null,
          diagnostics: null,
          livePositions: [],
        }),
      );
  }, [refreshTerminalStatus, selectedAccountKey]);

  useEffect(() => {
    lastTerminalSyncKeyRef.current = null;
  }, [selectedAccountKey]);

  // Poll terminal status while sync dialog is open so MT5 balance appears without manual refresh.
  useEffect(() => {
    if (!isSyncDialogOpen || !selectedAccountKey) return;

    const poll = async () => {
      try {
        await refreshTerminalStatus(selectedAccountKey, {
          reloadAccountsOnChange: true,
        });
      } catch {
        // Keep previous status shown in UI.
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [isSyncDialogOpen, refreshTerminalStatus, selectedAccountKey]);

  // Handle local selection change - updates global state
  const handleAccountChange = (value: string) => {
    if (value === "all") {
      setSelectedAccount(null);
      setSelectedAccountId(null);
    } else {
      const account = accounts.find((a) => a.id === value);
      if (account) {
        setSelectedAccount(account);
        setSelectedAccountId(value);
      }
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const firm = addForm.firmName?.trim();
    if (!firm) {
      setError("Please enter your prop firm name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const accountName = `${firm} - ${addForm.phaseType}`;
      const balanceNum = addForm.startingBalance.trim()
        ? Number(addForm.startingBalance.replace(/[^0-9.-]/g, ""))
        : 0;
      const useBalance = !Number.isNaN(balanceNum) && balanceNum > 0 ? String(balanceNum) : "0";
      const res = await fetch("/api/prop-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountName,
          firmName: firm,
          accountSize: useBalance,
          currentBalance: useBalance,
          startDate: addForm.startDate || new Date().toISOString().split("T")[0],
          status: "active",
          currentPhaseStatus: addForm.phaseType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to create account");
      }
      const newAccount = await res.json();
      setAddForm({
        firmName: "",
        phaseType: "2-phase",
        startDate: new Date().toISOString().split("T")[0],
        startingBalance: "",
      });
      setIsNewAccountOpen(false);
      await loadAccounts();
      await refreshPropAccounts?.();
      if (newAccount?.id) setSelectedAccountId(newAccount.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Are you sure you want to delete this account? This will also delete any linked MT5 accounts and cannot be undone.",
      )
    )
      return;

    setIsDeleting(id);
    setError(null);

    try {
      await deletePropAccount(id);

      setSelectedAccount(null);
      if (selectedAccountId === id) setSelectedAccountId(null);
      await loadAccounts();
      await refreshPropAccounts?.();
      setError(null);
    } catch (err) {
      console.error("[Delete] Error deleting prop account:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete account";
      setError(
        `Failed to delete account: ${errorMessage}. Please check the browser console for details.`,
      );
    } finally {
      setIsDeleting(null);
    }
  }

  async function handleResetMt5Sync(reason: "manual_reset" | "reconnect" = "manual_reset") {
    if (!selectedAccount) return false;

    setTerminalLoading(true);
    setMt5Error(null);

    try {
      const resetResult = await resetMt5SyncByPropAccount(selectedAccount.id, reason);
      if (!resetResult.success) {
        setMt5Error(resetResult.error || "Failed to reset MT5 sync");
        return false;
      }

      setTerminalStatus({
        connected: false,
        terminal: null,
        diagnostics: null,
        livePositions: [],
      });
      lastTerminalSyncKeyRef.current = null;
      await loadAccounts();
      await refreshPropAccounts?.();
      return true;
    } catch (error) {
      console.error("[ResetMt5Sync] Error:", error);
      setMt5Error("Failed to reset MT5 sync");
      return false;
    } finally {
      setTerminalLoading(false);
    }
  }

  async function handleConnectMt5() {
    if (!selectedAccount) return;

    setTerminalLoading(true);
    setMt5Error(null);

    try {
      const propSize = Number(
        selectedAccount.initial_balance ?? selectedAccount.accountSize ?? 0,
      );
      const balanceStr = mt5FormData.currentBalance?.trim();
      const balanceNum = balanceStr ? Number(balanceStr) : undefined;

      if (balanceNum != null && !Number.isNaN(balanceNum) && propSize > 0) {
        const diff = Math.abs(balanceNum - propSize);
        const tolerance = Math.max(propSize * 0.15, 500);
        if (diff > tolerance) {
          setMt5Error(
            `Balance $${balanceNum.toLocaleString()} doesn't match this prop account ($${propSize.toLocaleString()}). Use the correct prop account or update the balance.`,
          );
          return;
        }
      }

      if (terminalStatus?.mt5AccountId) {
        const resetOk = await handleResetMt5Sync("reconnect");
        if (!resetOk) return;
        setTerminalLoading(true);
      }

      const createResult = await createMT5Account({
        propAccountId: selectedAccount.id,
        server: mt5FormData.server,
        login: mt5FormData.login,
        password: mt5FormData.password,
        currentBalance: balanceNum,
      });

      if (!createResult.success) {
        setMt5Error(
          createResult.error ||
            (createResult.code === "MT5_ACCOUNT_EXISTS"
              ? "MT5 account already linked. Reset or reconnect MT5 sync first."
              : "Failed to create account"),
        );
        return;
      }

      const syncResult = await enableAutoSync(createResult.accountId!);
      if (!syncResult.success) {
        setMt5Error(syncResult.error || "Failed to enable auto-sync");
        return;
      }

      const normalizedBalance =
        balanceNum != null && !Number.isNaN(balanceNum) ? balanceNum : null;

      setTerminalStatus((previous) => ({
        connected: false,
        terminal: syncResult.terminal ?? previous?.terminal ?? null,
        mt5AccountId: createResult.accountId,
        mt5Account: {
          mt5AccountId: createResult.accountId!,
          server: mt5FormData.server,
          login: mt5FormData.login,
          accountName: `${mt5FormData.server} - ${mt5FormData.login}`,
          balance: normalizedBalance,
          equity: normalizedBalance,
        },
        diagnostics: previous?.diagnostics ?? null,
        livePositions: previous?.livePositions ?? [],
      }));

      await refreshTerminalStatus(selectedAccount.id, {
        reloadAccountsOnChange: true,
      });
      setMt5FormData({ server: "", login: "", password: "", currentBalance: "" });
    } catch (error) {
      console.error("[ConnectMt5] Error:", error);
      setMt5Error("Network error");
    } finally {
      setTerminalLoading(false);
    }
  }

  const getStatusColor = (percent: number, max: number) => {
    const ratio = percent / max;
    if (ratio < 0.5) return "bg-green-500";
    if (ratio < 0.75) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Auth checks
  if (!authLoading && !isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="surface p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">
            Sign-in not configured
          </h2>
          <p className="text-muted-foreground">
            Please configure Clerk to manage prop accounts.
          </p>
        </div>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="surface p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to manage your prop accounts.
          </p>
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:bg-[var(--accent-secondary)] transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-6 lg:space-y-8 max-w-[1280px]">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-label mb-1">Prop Firm</p>
          <h1 className="headline-lg">Account Tracker</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={selectedAccount?.id || "all"}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="w-full sm:w-[280px] bg-card border-border" aria-label="Select account">
              <SelectValue placeholder={accounts.length === 0 ? "No accounts yet" : "Select account"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name ?? account.accountName}
                  {account.phase ? ` — ${account.phase}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={loadAccounts}
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Dialog
            open={isNewAccountOpen}
            onOpenChange={(open) => {
              setIsNewAccountOpen(open);
              if (!open) setAddForm({ firmName: "", phaseType: "2-phase", startDate: new Date().toISOString().split("T")[0], startingBalance: "" });
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add Prop Account</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Track your prop firm challenge or funded account.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-firm">Prop firm name</Label>
                    <Input
                      id="add-firm"
                      placeholder="e.g. FTMO, Funding Pips, The5ers"
                      value={addForm.firmName}
                      onChange={(e) => setAddForm({ ...addForm, firmName: e.target.value })}
                      className="bg-card border-border"
                      autoComplete="organization"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-phase">Phase type</Label>
                    <Select
                      value={addForm.phaseType}
                      onValueChange={(v: "2-phase" | "1-phase" | "zero-phase") =>
                        setAddForm({ ...addForm, phaseType: v })
                      }
                    >
                      <SelectTrigger id="add-phase" className="bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2-phase">2-phase</SelectItem>
                        <SelectItem value="1-phase">1-phase</SelectItem>
                        <SelectItem value="zero-phase">Zero-phase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-start">When did this account start?</Label>
                    <Input
                      id="add-start"
                      type="date"
                      value={addForm.startDate}
                      onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
                      className="bg-card border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-balance">Starting balance ($)</Label>
                    <Input
                      id="add-balance"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 10000"
                      value={addForm.startingBalance}
                      onChange={(e) => setAddForm({ ...addForm, startingBalance: e.target.value })}
                      className="bg-card border-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Enter your account size so the tracker shows the correct balance. You can also set this when connecting MT5.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-sm"
                    onClick={() => setIsNewAccountOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-semibold hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-50"
                    disabled={isSubmitting || !addForm.firmName.trim()}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add Account"
                    )}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-2 underline h-auto p-0"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && accounts.length === 0 && (
        <div className="surface p-12">
          <Zap className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            No prop accounts yet. Add one to start tracking!
          </p>
          <button
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-semibold hover:bg-[var(--accent-secondary)] transition-colors"
            onClick={() => setIsNewAccountOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Your First Account
          </button>
        </div>
      )}

      {/* All Accounts Summary Grid */}
      {!loading && !selectedAccount && accounts.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="card-glow p-6 cursor-pointer hover:border-blue-500/50 transition-all group"
              onClick={() => handleAccountChange(account.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold group-hover:text-blue-400 transition-colors">
                    {account.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {account.firm} • {account.phase}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize",
                    account.status === "active"
                      ? "bg-[var(--profit-bg)] text-[var(--profit-primary)]"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {account.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="font-mono text-lg">
                    ${account.current_balance.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Profit/Loss</span>
                  <span
                    className={cn(
                      "font-mono font-medium",
                      account.current_balance >= account.initial_balance
                        ? "text-green-400"
                        : "text-red-400",
                    )}
                  >
                    {account.current_balance >= account.initial_balance
                      ? "+"
                      : ""}
                    $
                    {(
                      account.current_balance - account.initial_balance
                    ).toLocaleString()}
                  </span>
                </div>

                {/* Drawdown Progress Mini */}
                {account.daily_dd_max && (
                  <div className="space-y-1 pt-2 border-t border-border-subtle">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Daily DD</span>
                      <span
                        className={
                          (account.daily_dd_current || 0) >
                          toPercent(
                            account.daily_dd_max || 0,
                            account.initial_balance,
                          ) *
                            0.8
                            ? "text-red-400"
                            : "text-muted-foreground"
                        }
                      >
                        {(account.daily_dd_current || 0).toFixed(1)}% /{" "}
                        {toPercent(
                          account.daily_dd_max || 0,
                          account.initial_balance,
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          getStatusColor(
                            account.daily_dd_current || 0,
                            toPercent(
                              account.daily_dd_max || 0,
                              account.initial_balance,
                            ),
                          ),
                        )}
                        style={{
                          width: `${((account.daily_dd_current || 0) / toPercent(account.daily_dd_max || 0, account.initial_balance)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Account Overview */}
      {!loading && selectedAccount && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Status Card */}
          <div className="card-glow p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Zap className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="headline-md">{selectedAccount.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedAccount.firm} • {selectedAccount.phase}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 text-xs rounded-lg px-3"
                  onClick={() => {
                    setIsSyncDialogOpen(true);
                    if (!selectedAccount) return;
                    setTerminalLoading(true);
                    setMt5Error(null);
                    refreshTerminalStatus(selectedAccount.id)
                      .catch((error) => {
                        console.error("Error fetching terminal status:", error);
                        setMt5Error("Failed to check connection status");
                      })
                      .finally(() => setTerminalLoading(false));
                  }}
                >
                  <Download className="h-3 w-3" />
                  Sync MT5
                </Button>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium",
                    selectedAccount.compliance?.isCompliant
                      ? "bg-[var(--profit-bg)] text-[var(--profit-primary)]"
                      : "bg-[var(--loss-bg)] text-[var(--loss-primary)]",
                  )}
                >
                  {selectedAccount.compliance?.isCompliant ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1 inline" /> Compliant
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-1 inline" /> At Risk
                    </>
                  )}
                </span>
                <button
                  className="p-2 hover:bg-red-500/10 rounded text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleDelete(selectedAccount.id)}
                  disabled={isDeleting === selectedAccount.id}
                >
                  {isDeleting === selectedAccount.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Account Balance */}
            <div className="flex justify-between items-center p-4 rounded-lg bg-muted/20 border border-border-subtle mb-6">
              <div>
                <p className="text-label">Current Balance</p>
                <p className="stat-huge mt-1">
                  ${selectedAccount.current_balance.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-label">Profit/Loss</p>
                <p
                  className={cn(
                    "stat-large mt-1",
                    selectedAccount.current_balance >=
                      selectedAccount.initial_balance
                      ? "profit"
                      : "loss",
                  )}
                >
                  {selectedAccount.current_balance >=
                  selectedAccount.initial_balance
                    ? "+"
                    : ""}
                  $
                  {(
                    selectedAccount.current_balance -
                    selectedAccount.initial_balance
                  ).toLocaleString()}
                </p>
              </div>
            </div>

            {(terminalStatus?.mt5Account ||
              terminalStatus?.terminal ||
              terminalStatus?.diagnostics) && (
              <div className="mb-6 rounded-lg border border-border-subtle bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      MT5 Sync Status
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {terminalStatus.connected
                        ? "Terminal connected and reporting."
                        : "Terminal not currently connected."}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex rounded px-2 py-1 text-[11px] font-medium",
                      terminalStatus.connected
                        ? "bg-green-500/15 text-green-300"
                        : "bg-amber-500/15 text-amber-300",
                    )}
                  >
                    {terminalStatus.terminal?.status ?? "NOT_LINKED"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">MT5 account</p>
                    <p className="mt-1 font-mono text-white">
                      {terminalStatus.mt5Account
                        ? `${terminalStatus.mt5Account.server} / ${terminalStatus.mt5Account.login}`
                        : "Not linked"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Terminal ID</p>
                    <p className="mt-1 font-mono text-white break-all">
                      {terminalStatus.terminal?.terminalId ?? "Awaiting assignment"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Diagnostic</p>
                    <p className="mt-1 font-mono text-white">
                      {terminalStatus.diagnostics?.code ?? "NO_HEARTBEAT"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Last heartbeat</p>
                    <p className="mt-1 text-white">
                      {terminalStatus.terminal?.lastHeartbeat
                        ? new Date(
                            terminalStatus.terminal.lastHeartbeat,
                          ).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Live positions</p>
                    <p className="mt-1 text-white">
                      {terminalStatus.livePositions.length}
                    </p>
                  </div>
                </div>

                {terminalStatus.diagnostics?.message && (
                  <div className="mt-3 rounded-md border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                    {terminalStatus.diagnostics.message}
                  </div>
                )}

                {terminalStatus.livePositions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">
                        Live MT5 Positions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Not yet imported into journal analytics
                      </p>
                    </div>
                    <div className="space-y-2">
                      {terminalStatus.livePositions.map((position) => (
                        <div
                          key={`${position.ticket}-${position.positionId ?? "live"}`}
                          className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-medium text-white">
                              {position.symbol} {position.type}
                            </p>
                            <p className="text-muted-foreground">
                              {position.volume} lots at {position.openPrice}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={cn(
                                "font-mono",
                                position.profit >= 0 ? "profit" : "loss",
                              )}
                            >
                              ${position.profit.toLocaleString()}
                            </p>
                            <p className="text-muted-foreground">
                              Current: {position.currentPrice}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Drawdown Meters */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Daily Drawdown */}
              {selectedAccount.daily_dd_max && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border-subtle">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Daily Drawdown</span>
                    <span className="text-sm">
                      {(selectedAccount.daily_dd_current || 0).toFixed(1)}% /{" "}
                      {toPercent(
                        selectedAccount.daily_dd_max || 0,
                        selectedAccount.initial_balance,
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        getStatusColor(
                          selectedAccount.daily_dd_current || 0,
                          toPercent(
                            selectedAccount.daily_dd_max || 0,
                            selectedAccount.initial_balance,
                          ),
                        ),
                      )}
                      style={{
                        width: `${((selectedAccount.daily_dd_current || 0) / toPercent(selectedAccount.daily_dd_max || 0, selectedAccount.initial_balance)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(
                      toPercent(
                        selectedAccount.daily_dd_max || 0,
                        selectedAccount.initial_balance,
                      ) - (selectedAccount.daily_dd_current || 0)
                    ).toFixed(1)}
                    % remaining
                  </p>
                </div>
              )}

              {/* Total Drawdown */}
              {selectedAccount.total_dd_max && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border-subtle">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Drawdown</span>
                    <span className="text-sm">
                      {(selectedAccount.total_dd_current || 0).toFixed(1)}% /{" "}
                      {toPercent(
                        selectedAccount.total_dd_max || 0,
                        selectedAccount.initial_balance,
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        getStatusColor(
                          selectedAccount.total_dd_current || 0,
                          toPercent(
                            selectedAccount.total_dd_max || 0,
                            selectedAccount.initial_balance,
                          ),
                        ),
                      )}
                      style={{
                        width: `${((selectedAccount.total_dd_current || 0) / toPercent(selectedAccount.total_dd_max || 0, selectedAccount.initial_balance)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(
                      toPercent(
                        selectedAccount.total_dd_max || 0,
                        selectedAccount.initial_balance,
                      ) - (selectedAccount.total_dd_current || 0)
                    ).toFixed(1)}
                    % remaining
                  </p>
                </div>
              )}
            </div>

            {/* Profit Target */}
            {selectedAccount.profit_target &&
              selectedAccount.compliance?.profitProgress !== null && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border-subtle mt-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Profit Target</span>
                    <span className="text-sm">
                      {(
                        selectedAccount.compliance?.profitProgress || 0
                      ).toFixed(1)}
                      % /{" "}
                      {toPercent(
                        selectedAccount.profit_target,
                        selectedAccount.initial_balance,
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{
                        width: `${Math.min(((selectedAccount.compliance?.profitProgress || 0) / toPercent(selectedAccount.profit_target, selectedAccount.initial_balance)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(
                      toPercent(
                        selectedAccount.profit_target,
                        selectedAccount.initial_balance,
                      ) - (selectedAccount.compliance?.profitProgress || 0)
                    ).toFixed(1)}
                    % more to reach target
                  </p>
                </div>
              )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="surface p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Started</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedAccount.start_date
                      ? new Date(
                          selectedAccount.start_date,
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
            <div className="surface p-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Initial Balance</p>
                  <p className="text-xs text-muted-foreground">
                    ${selectedAccount.initial_balance.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="surface p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p
                    className={cn(
                      "text-xs",
                      selectedAccount.status === "active"
                        ? "text-green-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {(selectedAccount.status || "").charAt(0).toUpperCase() +
                      (selectedAccount.status || "").slice(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MT5 Cloud Sync Dialog */}
      <Dialog
        open={isSyncDialogOpen}
        onOpenChange={(open) => {
          setIsSyncDialogOpen(open);
          if (open && selectedAccount) {
            setTerminalLoading(true);
            refreshTerminalStatus(selectedAccount.id)
              .catch((error) => {
                console.error("Error fetching terminal status:", error);
              })
              .finally(() => setTerminalLoading(false));
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-400" />
              Connect MetaTrader 5
            </DialogTitle>
            <DialogDescription>
              Sync your MT5 account through Terminal Farm and inspect the exact
              sync state from here.
            </DialogDescription>
          </DialogHeader>

          {terminalLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : terminalStatus?.connected ? (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">
                      Terminal connected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Terminal ID:{" "}
                      <span className="font-mono text-foreground">
                        {terminalStatus.terminal?.terminalId ?? "Unknown"}
                      </span>
                    </p>
                    {terminalStatus.mt5Account && (
                      <p className="text-xs text-muted-foreground">
                        Linked MT5 session:{" "}
                        <span className="font-mono text-foreground">
                          {terminalStatus.mt5Account.server}
                        </span>{" "}
                        /{" "}
                        <span className="font-mono text-foreground">
                          {terminalStatus.mt5Account.login}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Last heartbeat</span>
                  <span className="text-right text-white">
                    {terminalStatus.terminal?.lastHeartbeat
                      ? new Date(
                          terminalStatus.terminal.lastHeartbeat,
                        ).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Terminal status</span>
                  <span className="text-right text-white">
                    {terminalStatus.terminal?.status ?? "UNKNOWN"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Last trade sync</span>
                  <span className="text-right text-white">
                    {terminalStatus.terminal?.lastSyncAt
                      ? new Date(
                          terminalStatus.terminal.lastSyncAt,
                        ).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                {terminalStatus.diagnostics && (
                  <>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Diagnostic code
                      </span>
                      <span className="text-right font-mono text-white">
                        {terminalStatus.diagnostics.code}
                      </span>
                    </div>
                    <div className="rounded-md border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                      {terminalStatus.diagnostics.message}
                    </div>
                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        Last imported:{" "}
                        <span className="font-mono text-foreground">
                          {terminalStatus.diagnostics.lastTradeImportCount ?? 0}
                        </span>
                      </div>
                      <div>
                        Last skipped:{" "}
                        <span className="font-mono text-foreground">
                          {terminalStatus.diagnostics.lastTradeSkipCount ?? 0}
                        </span>
                      </div>
                      <div>
                        Last seen deals:{" "}
                        <span className="font-mono text-foreground">
                          {terminalStatus.diagnostics.lastSeenDealCount ?? 0}
                        </span>
                      </div>
                      <div>
                        Live positions:{" "}
                        <span className="font-mono text-foreground">
                          {terminalStatus.livePositions.length}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                {terminalStatus.terminal?.errorMessage && (
                  <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                    {terminalStatus.terminal.errorMessage}
                  </div>
                )}
              </div>

              {terminalStatus.livePositions.length > 0 && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">
                      Live MT5 Positions
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {terminalStatus.livePositions.length} open
                    </span>
                  </div>
                  <div className="space-y-2">
                    {terminalStatus.livePositions.map((position) => (
                      <div
                        key={`${position.ticket}-${position.positionId ?? "live"}`}
                        className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2 text-xs"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-white">
                            {position.symbol} {position.type}
                          </p>
                          <p className="text-muted-foreground">
                            {position.volume} lots at {position.openPrice}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "font-mono",
                              position.profit >= 0 ? "profit" : "loss",
                            )}
                          >
                            ${position.profit.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">
                            Current: {position.currentPrice}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mt5Error && (
                <p className="text-center text-sm text-red-400">{mt5Error}</p>
              )}

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!selectedAccount) return;
                    const confirmed = confirm(
                      "Disable auto-sync for this linked MT5 account?",
                    );
                    if (!confirmed) return;

                    const status = await refreshTerminalStatus(selectedAccount.id);
                    if (!status.mt5AccountId) {
                      setMt5Error("MT5 account not found");
                      return;
                    }

                    await disableAutoSync(status.mt5AccountId);
                    setTerminalStatus({
                      connected: false,
                      terminal: null,
                      mt5AccountId: status.mt5AccountId,
                      mt5Account: status.mt5Account,
                      diagnostics: status.diagnostics,
                      livePositions: [],
                    });
                  }}
                >
                  Disable Auto-Sync
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    void handleResetMt5Sync("manual_reset");
                  }}
                >
                  Reset MT5 Sync
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {terminalStatus?.mt5Account && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
                  <p className="font-medium text-foreground">
                    Saved MT5 account
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Server:{" "}
                    <span className="font-mono text-foreground">
                      {terminalStatus.mt5Account.server}
                    </span>{" "}
                    · Login:{" "}
                    <span className="font-mono text-foreground">
                      {terminalStatus.mt5Account.login}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Terminal ID:{" "}
                    <span className="font-mono text-foreground break-all">
                      {terminalStatus.terminal?.terminalId ?? "Awaiting assignment"}
                    </span>
                  </p>
                  {terminalStatus.mt5Account.balance != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last broker balance:{" "}
                      <span className="font-mono text-foreground">
                        $
                        {Number(
                          terminalStatus.mt5Account.balance,
                        ).toLocaleString()}
                      </span>
                    </p>
                  )}
                  {terminalStatus.terminal?.status && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Terminal status:{" "}
                      <span className="font-mono text-foreground">
                        {terminalStatus.terminal.status}
                      </span>
                    </p>
                  )}
                  {terminalStatus.diagnostics && (
                    <p className="mt-2 rounded-md border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                      <span className="font-mono text-foreground">
                        {terminalStatus.diagnostics.code}
                      </span>{" "}
                      · {terminalStatus.diagnostics.message}
                    </p>
                  )}
                </div>
              )}

              {selectedAccount && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <span className="text-muted-foreground">
                    This prop account size:{" "}
                  </span>
                  <span className="font-mono font-semibold">
                    $
                    {Number(
                      selectedAccount.initial_balance ??
                        selectedAccount.accountSize ??
                        0,
                    ).toLocaleString()}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Re-enter your MT5 credentials to create a fresh terminal
                    link. Existing imported trades will stay attached to this
                    prop account.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label htmlFor="mt5-server">Server</Label>
                  <Input
                    id="mt5-server"
                    placeholder="e.g., ICMarketsSC-Demo"
                    value={mt5FormData.server}
                    onChange={(e) =>
                      setMt5FormData({ ...mt5FormData, server: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mt5-login">Login</Label>
                  <Input
                    id="mt5-login"
                    placeholder="Your MT5 account number"
                    value={mt5FormData.login}
                    onChange={(e) =>
                      setMt5FormData({ ...mt5FormData, login: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mt5-password">Password</Label>
                  <Input
                    id="mt5-password"
                    type="password"
                    placeholder="Your MT5 investor password"
                    value={mt5FormData.password}
                    onChange={(e) =>
                      setMt5FormData({
                        ...mt5FormData,
                        password: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use the investor password if your broker supports it.
                  </p>
                </div>
                <div>
                  <Label htmlFor="mt5-balance">
                    Current account balance (optional)
                  </Label>
                  <Input
                    id="mt5-balance"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 10000"
                    value={mt5FormData.currentBalance}
                    onChange={(e) =>
                      setMt5FormData({
                        ...mt5FormData,
                        currentBalance: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              {mt5Error && <p className="text-sm text-red-400">{mt5Error}</p>}

              <DialogFooter className="gap-2 sm:justify-between">
                {terminalStatus?.mt5AccountId ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void handleResetMt5Sync("manual_reset");
                    }}
                  >
                    Reset MT5 Sync
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    void handleConnectMt5();
                  }}
                  disabled={
                    terminalLoading ||
                    !mt5FormData.server ||
                    !mt5FormData.login ||
                    !mt5FormData.password
                  }
                >
                  {terminalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {terminalStatus?.mt5AccountId ? "Reconnecting..." : "Connecting..."}
                    </>
                  ) : terminalStatus?.mt5AccountId ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reconnect MT5
                    </>
                  ) : (
                    <>
                      <Cloud className="mr-2 h-4 w-4" />
                      Enable Auto-Sync
                    </>
                  )}
                </Button>
              </DialogFooter>

              <p className="text-center text-xs text-muted-foreground">
                Terminal Farm runs MT5 in Docker and now exposes terminal state,
                diagnostics, and live positions directly in the app.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

