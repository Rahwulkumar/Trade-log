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
    terminalId?: string;
    status?: string;
    lastHeartbeat?: string | null;
    lastSyncAt?: string | null;
    errorMessage?: string | null;
    mt5Account?: {
      server: string;
      login: string;
      accountName: string | null;
      balance: number | null;
      equity: number | null;
    };
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
    getTerminalStatusByPropAccount(selectedAccountKey)
      .then((result) => {
        const mt5 = result.mt5Account
          ? {
              server: result.mt5Account.server,
              login: result.mt5Account.login,
              accountName: result.mt5Account.accountName,
              balance: result.mt5Account.balance,
              equity: result.mt5Account.equity,
            }
          : undefined;
        setTerminalStatus(
          result.connected
            ? {
                connected: true,
                terminalId: result.terminal?.terminalId,
                status: result.terminal?.status,
                lastHeartbeat: result.terminal?.lastHeartbeat ?? undefined,
                lastSyncAt: result.terminal?.lastSyncAt ?? undefined,
                errorMessage: result.terminal?.errorMessage ?? undefined,
                mt5Account: mt5,
              }
            : {
                connected: false,
                status: result.terminal?.status,
                lastHeartbeat: result.terminal?.lastHeartbeat ?? undefined,
                lastSyncAt: result.terminal?.lastSyncAt ?? undefined,
                errorMessage: result.terminal?.errorMessage ?? undefined,
                mt5Account: mt5,
              },
        );
      })
      .catch(() => setTerminalStatus({ connected: false }));
  }, [selectedAccountKey]);

  useEffect(() => {
    lastTerminalSyncKeyRef.current = null;
  }, [selectedAccountKey]);

  // Poll terminal status while sync dialog is open so MT5 balance appears without manual refresh.
  useEffect(() => {
    if (!isSyncDialogOpen || !selectedAccountKey) return;

    const poll = async () => {
      try {
        const result = await getTerminalStatusByPropAccount(selectedAccountKey);
        const mt5 = result.mt5Account
          ? {
              server: result.mt5Account.server,
              login: result.mt5Account.login,
              accountName: result.mt5Account.accountName,
              balance: result.mt5Account.balance,
              equity: result.mt5Account.equity,
            }
          : undefined;

        setTerminalStatus(
          result.connected
            ? {
                connected: true,
                terminalId: result.terminal?.terminalId,
                status: result.terminal?.status,
                lastHeartbeat: result.terminal?.lastHeartbeat ?? undefined,
                lastSyncAt: result.terminal?.lastSyncAt ?? undefined,
                errorMessage: result.terminal?.errorMessage ?? undefined,
                mt5Account: mt5,
              }
            : {
                connected: false,
                status: result.terminal?.status,
                lastHeartbeat: result.terminal?.lastHeartbeat ?? undefined,
                lastSyncAt: result.terminal?.lastSyncAt ?? undefined,
                errorMessage: result.terminal?.errorMessage ?? undefined,
                mt5Account: mt5,
              },
        );

        const syncKey = [
          result.terminal?.lastHeartbeat ?? "",
          result.terminal?.lastSyncAt ?? "",
          mt5?.balance ?? "",
          mt5?.equity ?? "",
        ].join("|");

        if (syncKey !== lastTerminalSyncKeyRef.current) {
          lastTerminalSyncKeyRef.current = syncKey;
          await loadAccounts();
        }
      } catch {
        // Keep previous status shown in UI.
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [isSyncDialogOpen, selectedAccountKey, loadAccounts]);

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
      // First, check if there's an MT5 account linked and disable auto-sync
      try {
        const mt5Status = await getTerminalStatusByPropAccount(id);
        if (mt5Status.connected && mt5Status.mt5AccountId) {
          await disableAutoSync(mt5Status.mt5AccountId);
          // Give orchestrator a moment to process the stop command
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (mt5Err) {
        console.warn(
          "[Delete] Error disabling MT5 auto-sync (continuing with delete):",
          mt5Err,
        );
        // Continue with deletion even if MT5 disable fails
      }

      // Delete the prop account
      await deletePropAccount(id);

      // Clear selection if this was the selected account
      setSelectedAccount(null);
      if (selectedAccountId === id) setSelectedAccountId(null);

      // Reload accounts list
      await loadAccounts();

      // Clear any errors
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

                    // Fetch status immediately since onOpenChange doesn't fire on open
                    if (selectedAccount) {
                      setTerminalLoading(true);
                      setMt5Error(null);
                      getTerminalStatusByPropAccount(selectedAccount.id)
                        .then((result) => {
                          const mt5 = result.mt5Account
                            ? {
                                server: result.mt5Account.server,
                                login: result.mt5Account.login,
                                accountName: result.mt5Account.accountName,
                                balance: result.mt5Account.balance,
                                equity: result.mt5Account.equity,
                              }
                            : undefined;
                          setTerminalStatus(
                            result.connected
                              ? {
                                  connected: true,
                                  terminalId: result.terminal?.terminalId,
                                  status: result.terminal?.status,
                                  lastHeartbeat: result.terminal?.lastHeartbeat,
                                  lastSyncAt: result.terminal?.lastSyncAt,
                                  errorMessage: result.terminal?.errorMessage,
                                  mt5Account: mt5,
                                }
                              : {
                                  connected: false,
                                  status: result.terminal?.status,
                                  lastHeartbeat:
                                    result.terminal?.lastHeartbeat ?? undefined,
                                  lastSyncAt:
                                    result.terminal?.lastSyncAt ?? undefined,
                                  errorMessage:
                                    result.terminal?.errorMessage ?? undefined,
                                  mt5Account: mt5,
                                },
                          );
                        })
                        .catch((error) => {
                          console.error(
                            "Error fetching terminal status:",
                            error,
                          );
                          setMt5Error("Failed to check connection status");
                        })
                        .finally(() => setTerminalLoading(false));
                    }
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
            // Fetch connection status when dialog opens
            setTerminalLoading(true);
            getTerminalStatusByPropAccount(selectedAccount.id)
              .then((result) => {
                const mt5 = result.mt5Account
                  ? {
                      server: result.mt5Account.server,
                      login: result.mt5Account.login,
                      accountName: result.mt5Account.accountName,
                      balance: result.mt5Account.balance,
                      equity: result.mt5Account.equity,
                    }
                  : undefined;
                setTerminalStatus(
                  result.connected
                    ? {
                        connected: true,
                        terminalId: result.terminal?.terminalId,
                        status: result.terminal?.status,
                        lastHeartbeat: result.terminal?.lastHeartbeat,
                        lastSyncAt: result.terminal?.lastSyncAt,
                        errorMessage: result.terminal?.errorMessage,
                        mt5Account: mt5,
                      }
                    : {
                        connected: false,
                        status: result.terminal?.status,
                        lastHeartbeat: result.terminal?.lastHeartbeat ?? undefined,
                        lastSyncAt: result.terminal?.lastSyncAt ?? undefined,
                        errorMessage: result.terminal?.errorMessage ?? undefined,
                        mt5Account: mt5,
                      },
                );
              })
              .catch((error) => {
                console.error("Error fetching terminal status:", error);
              })
              .finally(() => setTerminalLoading(false));
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-400" />
              Connect MetaTrader 5
            </DialogTitle>
            <DialogDescription>
              Sync your trades automatically via cloud. No software installation
              required.
            </DialogDescription>
          </DialogHeader>

          {terminalLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : terminalStatus?.connected ? (
            // Connected State - Show Terminal Status
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Terminal Connected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Terminal ID: {terminalStatus.terminalId}
                    </p>
                    {terminalStatus.mt5Account && (
                      <>
                        <p className="text-xs text-muted-foreground mt-1">
                          Using your MT5 account:{" "}
                          <span className="font-mono text-foreground">
                            {terminalStatus.mt5Account.server}
                          </span>{" "}
                          / Login{" "}
                          <span className="font-mono text-foreground">
                            {terminalStatus.mt5Account.login}
                          </span>
                        </p>
                        {terminalStatus.mt5Account.balance != null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Broker balance:{" "}
                            <span className="font-mono text-foreground">
                              $
                              {Number(
                                terminalStatus.mt5Account.balance,
                              ).toLocaleString()}
                            </span>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Terminal Status */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Heartbeat</span>
                  <span className="text-white">
                    {terminalStatus.lastHeartbeat
                      ? new Date(terminalStatus.lastHeartbeat).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-white">
                    {terminalStatus.status || "UNKNOWN"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span className="text-white">
                    {terminalStatus.lastSyncAt
                      ? new Date(terminalStatus.lastSyncAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                {terminalStatus.errorMessage && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    {terminalStatus.errorMessage}
                  </div>
                )}
              </div>

              {/* Info Message */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
                <p className="font-medium mb-1">Auto-Sync Enabled</p>
                <p className="text-xs text-muted-foreground">
                  Your trades are automatically synced from MT5. No manual sync
                  needed.
                </p>
              </div>

              {mt5Error && (
                <p className="text-sm text-red-400 text-center">{mt5Error}</p>
              )}

              {/* Disconnect Link */}
              <button
                className="text-xs text-muted-foreground hover:text-red-400 mx-auto block"
                onClick={async () => {
                  if (!selectedAccount) return;
                  const confirmed = confirm(
                    "Are you sure you want to disable auto-sync for this MT5 account?",
                  );
                  if (confirmed) {
                    // Find MT5 account ID first
                    const status = await getTerminalStatusByPropAccount(
                      selectedAccount.id,
                    );
                    if (status.mt5AccountId) {
                      await disableAutoSync(status.mt5AccountId);
                      setTerminalStatus({ connected: false });
                    } else {
                      setMt5Error("MT5 account not found");
                    }
                  }
                }}
              >
                Disable Auto-Sync
              </button>
            </div>
          ) : (
            // Not Connected - Show saved MT5 details if we have them, or connection form
            <div className="space-y-4 py-4">
              {terminalStatus?.mt5Account && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
                  <p className="font-medium text-foreground">Your MT5 account is saved</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Server: <span className="font-mono text-foreground">{terminalStatus.mt5Account.server}</span> · Login: <span className="font-mono text-foreground">{terminalStatus.mt5Account.login}</span>
                  </p>
                  {terminalStatus.mt5Account.balance != null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last synced broker balance:{" "}
                      <span className="font-mono text-foreground">
                        ${Number(terminalStatus.mt5Account.balance).toLocaleString()}
                      </span>
                    </p>
                  )}
                  {terminalStatus.status && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Terminal status:{" "}
                      <span className="font-mono text-foreground">
                        {terminalStatus.status}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    The app uses these credentials when the Terminal Farm orchestrator runs. Start the orchestrator to sync trades and balance automatically. To change server or login, enter new details below and click Enable Auto-Sync again.
                  </p>
                </div>
              )}
              {selectedAccount && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <span className="text-muted-foreground">This prop account size: </span>
                  <span className="font-mono font-semibold">${Number(selectedAccount.initial_balance ?? selectedAccount.accountSize ?? 0).toLocaleString()}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your MT5 balance should match this so trades sync correctly.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Enter your MT5 account credentials. Your password is encrypted
                and never stored in plain text.
              </p>

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
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Use the investor (read-only) password for safety.
                  </p>
                </div>
                <div>
                  <Label htmlFor="mt5-balance">Current account balance (optional)</Label>
                  <Input
                    id="mt5-balance"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 10000"
                    value={mt5FormData.currentBalance}
                    onChange={(e) =>
                      setMt5FormData({ ...mt5FormData, currentBalance: e.target.value })
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Validated against this prop account size. Leave blank to skip.
                  </p>
                </div>
              </div>

              {mt5Error && <p className="text-sm text-red-400">{mt5Error}</p>}

              <DialogFooter>
                <Button
                  className="w-full"
                  onClick={async () => {
                    if (!selectedAccount) return;
                    setTerminalLoading(true);
                    setMt5Error(null);
                    try {
                      const propSize = Number(selectedAccount.initial_balance ?? selectedAccount.accountSize ?? 0);
                      const balanceStr = mt5FormData.currentBalance?.trim();
                      const balanceNum = balanceStr ? Number(balanceStr) : undefined;
                      if (balanceNum != null && !Number.isNaN(balanceNum) && propSize > 0) {
                        const diff = Math.abs(balanceNum - propSize);
                        const tolerance = Math.max(propSize * 0.15, 500);
                        if (diff > tolerance) {
                          setMt5Error(
                            `Balance $${balanceNum.toLocaleString()} doesn’t match this prop account ($${propSize.toLocaleString()}). Use the correct prop account or update the balance.`
                          );
                          setTerminalLoading(false);
                          return;
                        }
                      }
                      // 1. Create MT5 account
                      const createResult = await createMT5Account({
                        propAccountId: selectedAccount.id,
                        server: mt5FormData.server,
                        login: mt5FormData.login,
                        password: mt5FormData.password,
                        currentBalance: balanceNum,
                      });

                      if (!createResult.success) {
                        setMt5Error(
                          createResult.error || "Failed to create account",
                        );
                        setTerminalLoading(false);
                        return;
                      }

                      // 2. Enable auto-sync
                      const syncResult = await enableAutoSync(
                        createResult.accountId!,
                      );

                      if (!syncResult.success) {
                        setMt5Error(
                          syncResult.error || "Failed to enable auto-sync",
                        );
                        setTerminalLoading(false);
                        return;
                      }

                      // 3. Refresh terminal status (use prop account ID to find MT5 account)
                      const status = await getTerminalStatusByPropAccount(
                        selectedAccount.id,
                      );
                      const mt5 = status.mt5Account
                        ? {
                            server: status.mt5Account.server,
                            login: status.mt5Account.login,
                            accountName: status.mt5Account.accountName,
                            balance: status.mt5Account.balance,
                            equity: status.mt5Account.equity,
                          }
                        : undefined;
                      setTerminalStatus(
                        status.connected
                          ? {
                              connected: true,
                              terminalId: status.terminal?.terminalId,
                              status: status.terminal?.status,
                              lastHeartbeat: status.terminal?.lastHeartbeat,
                              lastSyncAt: status.terminal?.lastSyncAt,
                              errorMessage: status.terminal?.errorMessage,
                              mt5Account: mt5,
                            }
                          : {
                              connected: false,
                              status: status.terminal?.status,
                              lastHeartbeat:
                                status.terminal?.lastHeartbeat ?? undefined,
                              lastSyncAt: status.terminal?.lastSyncAt ?? undefined,
                              errorMessage:
                                status.terminal?.errorMessage ?? undefined,
                              mt5Account: mt5,
                            },
                      );

                      setMt5FormData({ server: "", login: "", password: "", currentBalance: "" });
                      // Reload accounts so Account Tracker shows updated balance from MT5
                      await loadAccounts();
                    } catch {
                      setMt5Error("Network error");
                    } finally {
                      setTerminalLoading(false);
                    }
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4" />
                      Enable Auto-Sync
                    </>
                  )}
                </Button>
              </DialogFooter>

              <p className="text-xs text-center text-muted-foreground">
                Terminal Farm: Self-hosted Docker containers for real-time sync
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
