"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import {
  getPropAccounts,
  // createPropAccount removed
  deletePropAccount,
  checkCompliance,
  recalculateBalanceFromTrades,
  type ComplianceStatus,
} from "@/lib/api/prop-accounts";
import {
  getPropFirms,
  getFirmChallenges,
  createAccountFromChallenge,
} from "@/lib/api/prop-firms";
import type { PropFirm, PropFirmChallenge } from "@/lib/types/prop-firms";

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
  getTerminalStatus,
  getTerminalStatusByPropAccount,
  disableAutoSync,
  createMT5Account,
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
import type { PropAccount } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

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
  const { selectedAccountId, setSelectedAccountId } = usePropAccount();
  const [accounts, setAccounts] = useState<PropAccountWithCompliance[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<PropAccountWithCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  // Terminal Farm State
  const [terminalStatus, setTerminalStatus] = useState<{
    connected: boolean;
    terminalId?: string;
    status?: string;
    lastHeartbeat?: string | null;
    lastSyncAt?: string | null;
    errorMessage?: string | null;
  } | null>(null);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [mt5FormData, setMt5FormData] = useState({
    server: "",
    login: "",
    password: "",
  });
  const [mt5Error, setMt5Error] = useState<string | null>(null);

  // Prop Firm Data State
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [challenges, setChallenges] = useState<PropFirmChallenge[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string>("");
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("");

  // Simplified Form State (we only need Name and Start Date really, rules come from challenge)
  const [formData, setFormData] = useState({
    name: "",
    start_date: new Date().toISOString().split("T")[0],
    // Optional overrides (if user wants to tweak what DB gave them, or for custom manual entry)
    initial_balance: "",
  });

  // Load Firms on open
  useEffect(() => {
    if (isNewAccountOpen) {
      getPropFirms().then(setFirms).catch(console.error);
    }
  }, [isNewAccountOpen]);

  // Load Challenges when firm selected
  useEffect(() => {
    if (selectedFirmId) {
      getFirmChallenges(selectedFirmId)
        .then(setChallenges)
        .catch(console.error);
    } else {
      setChallenges([]);
    }
  }, [selectedFirmId]);

  // Auto-fill form details when challenge selected
  useEffect(() => {
    if (selectedChallengeId) {
      const challenge = challenges.find((c) => c.id === selectedChallengeId);
      if (challenge) {
        // Auto-generate a name if empty
        if (!formData.name) {
          setFormData((prev) => ({
            ...prev,
            name: `${challenge.name} - ${challenge.phase_name}`,
          }));
        }
      }
    }
  }, [selectedChallengeId, challenges, formData.name]);

  const loadAccounts = useCallback(async () => {
    if (!isConfigured || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const accountsData = await getPropAccounts();

      // Recalculate balance from trades for each account (ensures balance is always up to date)
      await Promise.all(
        accountsData.map((account) => recalculateBalanceFromTrades(account.id)),
      );

      // Refetch accounts after balance recalculation
      const updatedAccountsData = await getPropAccounts();

      // Get compliance for each account
      const accountsWithCompliance = await Promise.all(
        updatedAccountsData.map(async (account) => {
          const compliance = await checkCompliance(account.id);
          return { ...account, compliance };
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

    // We need either a selected challenge OR manual entry (which we haven't fully implemented back yet, prioritizing DB path)
    if (!formData.name || !selectedChallengeId) {
      setError("Please select a firm and challenge, and provide a name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newAccount = await createAccountFromChallenge({
        userId: user.id,
        challengeId: selectedChallengeId,
        name: formData.name,
        startDate: formData.start_date,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        start_date: new Date().toISOString().split("T")[0],
        initial_balance: "",
      });
      setSelectedFirmId("");
      setSelectedChallengeId("");
      setIsNewAccountOpen(false);

      // Reload accounts and select the new one
      await loadAccounts();
      if (newAccount) setSelectedAccountId(newAccount.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this account? This will also delete any linked MT5 accounts and cannot be undone.")) return;

    setIsDeleting(id);
    setError(null);

    try {
      // First, check if there's an MT5 account linked and disable auto-sync
      try {
        const mt5Status = await getTerminalStatusByPropAccount(id);
        if (mt5Status.connected && mt5Status.mt5AccountId) {
          console.log("[Delete] Disabling auto-sync for MT5 account:", mt5Status.mt5AccountId);
          await disableAutoSync(mt5Status.mt5AccountId);
          // Give orchestrator a moment to process the stop command
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (mt5Err) {
        console.warn("[Delete] Error disabling MT5 auto-sync (continuing with delete):", mt5Err);
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
      const errorMessage = err instanceof Error ? err.message : "Failed to delete account";
      setError(`Failed to delete account: ${errorMessage}. Please check the browser console for details.`);
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
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">
            Supabase Not Configured
          </h2>
          <p className="text-muted-foreground">
            Please add your Supabase credentials.
          </p>
        </div>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to manage your prop accounts.
          </p>
          <a
            href="/auth/login"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg font-medium"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-label mb-1">Prop Firm</p>
          <h1 className="headline-lg">Account Tracker</h1>
        </div>

        <div className="flex items-center gap-3">
          {accounts.length > 0 && (
            <Select
              value={selectedAccount?.id || "all"}
              onValueChange={handleAccountChange}
            >
              <SelectTrigger className="w-[280px] bg-void-surface border-white/10">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - {account.phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <button
            className="bg-transparent border border-white/10 hover:bg-white/5 p-2 rounded-lg"
            onClick={loadAccounts}
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <Dialog open={isNewAccountOpen} onOpenChange={setIsNewAccountOpen}>
            <DialogTrigger asChild>
              <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg font-medium">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-void-surface border-white/10">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add Prop Account</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Track your prop firm challenge or funded account.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Firm</Label>
                    <Select
                      value={selectedFirmId}
                      onValueChange={setSelectedFirmId}
                    >
                      <SelectTrigger className="bg-void border-white/10">
                        <SelectValue placeholder="Select Prop Firm" />
                      </SelectTrigger>
                      <SelectContent>
                        {firms.map((firm) => (
                          <SelectItem key={firm.id} value={firm.id}>
                            {firm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedFirmId && (
                    <div className="space-y-2">
                      <Label>Challenge / Phase</Label>
                      <Select
                        value={selectedChallengeId}
                        onValueChange={setSelectedChallengeId}
                      >
                        <SelectTrigger className="bg-void border-white/10">
                          <SelectValue placeholder="Select Challenge" />
                        </SelectTrigger>
                        <SelectContent>
                          {challenges.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} - {c.phase_name} ($
                              {c.initial_balance.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedChallengeId &&
                    (() => {
                      const challenge = challenges.find(
                        (c) => c.id === selectedChallengeId,
                      );
                      if (!challenge) return null;
                      return (
                        <div className="p-4 rounded-lg bg-void border border-white/5 space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">
                            Challenge Rules
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground block text-xs">
                                Initial Balance
                              </span>
                              <span className="font-mono text-green-400">
                                ${challenge.initial_balance.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">
                                Profit Target
                              </span>
                              <span className="font-mono text-blue-400">
                                {challenge.profit_target_percent
                                  ? `${challenge.profit_target_percent}%`
                                  : "None"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">
                                Daily Loss Limit
                              </span>
                              <span className="font-mono text-red-400">
                                {challenge.daily_loss_percent
                                  ? `${challenge.daily_loss_percent}%`
                                  : challenge.daily_loss_amount
                                    ? `$${challenge.daily_loss_amount.toLocaleString()}`
                                    : "-"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">
                                Max Loss Limit
                              </span>
                              <span className="font-mono text-red-500">
                                {challenge.max_loss_percent
                                  ? `${challenge.max_loss_percent}%`
                                  : challenge.max_loss_amount
                                    ? `$${challenge.max_loss_amount.toLocaleString()}`
                                    : "-"}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground block text-xs">
                                Drawdown Type
                              </span>
                              <span className="capitalize">
                                {challenge.drawdown_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      placeholder="e.g. My FTMO Account"
                      className="bg-void border-white/10"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      className="bg-void border-white/10"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button
                    type="button"
                    className="bg-transparent border border-white/10 hover:bg-white/5 rounded-lg px-4 py-2"
                    onClick={() => setIsNewAccountOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg font-medium"
                    disabled={isSubmitting}
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
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
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
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-12 text-center">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            No prop accounts yet. Add one to start tracking!
          </p>
          <button
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg font-medium"
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
              className="bg-black/60 backdrop-blur-xl border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)] rounded-xl p-6 cursor-pointer hover:border-blue-500/50 transition-all group"
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
                    "badge-void px-2 py-0.5 text-xs capitalize",
                    account.status === "active"
                      ? "text-green-400 border-green-400/20"
                      : "text-muted-foreground",
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
                  <div className="space-y-1 pt-2 border-t border-white/5">
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
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
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
          <div className="bg-black/60 backdrop-blur-xl border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)] rounded-xl p-6 md:col-span-2">
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
                <button
                  className="bg-transparent border border-white/10 hover:bg-white/5 rounded-lg text-xs px-3 py-1 flex items-center gap-2 border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => {
                    console.log(
                      "🟢 [BUTTON] Sync MT5 clicked, selectedAccount:",
                      selectedAccount?.id,
                    );
                    setIsSyncDialogOpen(true);

                    // Fetch status immediately since onOpenChange doesn't fire on open
                    if (selectedAccount) {
                      console.log(
                        "🟢 [BUTTON] Fetching Terminal status for account:",
                        selectedAccount.id,
                      );
                      setTerminalLoading(true);
                      setMt5Error(null);
                      getTerminalStatusByPropAccount(selectedAccount.id)
                        .then((result) => {
                          console.log("🟢 [BUTTON] Terminal status result:", {
                            connected: result.connected,
                            terminalId: result.terminal?.terminalId,
                            mt5AccountId: result.mt5AccountId,
                          });
                          setTerminalStatus(
                            result.connected
                              ? {
                                  connected: true,
                                  terminalId: result.terminal?.terminalId,
                                  status: result.terminal?.status,
                                  lastHeartbeat: result.terminal?.lastHeartbeat,
                                  lastSyncAt: result.terminal?.lastSyncAt,
                                  errorMessage: result.terminal?.errorMessage,
                                }
                              : { connected: false },
                          );
                          console.log(
                            "🟢 [BUTTON] Set terminalStatus state:",
                            result.connected ? "CONNECTED" : "NOT CONNECTED",
                          );
                        })
                        .catch((error) => {
                          console.error(
                            "🔴 [BUTTON] Error fetching Terminal status:",
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
                </button>
                <span
                  className={cn(
                    "badge-void px-3 py-1",
                    selectedAccount.compliance?.isCompliant
                      ? "text-green-400 border-green-400/20 bg-green-400/10"
                      : "text-red-400 border-red-400/20 bg-red-400/10",
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
            <div className="flex justify-between items-center p-4 rounded-lg bg-white/[0.02] border border-white/5 mb-6">
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
                <div className="space-y-3 p-4 rounded-lg bg-white/[0.02] border border-white/5">
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
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
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
                <div className="space-y-3 p-4 rounded-lg bg-white/[0.02] border border-white/5">
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
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
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
                <div className="space-y-3 p-4 rounded-lg bg-white/[0.02] border border-white/5 mt-4">
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
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
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
            <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Started</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedAccount.start_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-6">
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
            <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-xl p-6">
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
          console.log("🔵 [FRONTEND] Dialog onOpenChange:", {
            open,
            hasSelectedAccount: !!selectedAccount,
            selectedAccountId: selectedAccount?.id,
          });
          setIsSyncDialogOpen(open);
          if (open && selectedAccount) {
            console.log(
              "🔵 [FRONTEND] Fetching Terminal status for account:",
              selectedAccount.id,
            );
            // Fetch connection status when dialog opens
            setTerminalLoading(true);
            getTerminalStatusByPropAccount(selectedAccount.id)
              .then((result) => {
                console.log("🔵 [FRONTEND] Terminal status result:", {
                  connected: result.connected,
                  terminalId: result.terminal?.terminalId,
                  mt5AccountId: result.mt5AccountId,
                });
                setTerminalStatus(
                  result.connected
                    ? {
                        connected: true,
                        terminalId: result.terminal?.terminalId,
                        status: result.terminal?.status,
                        lastHeartbeat: result.terminal?.lastHeartbeat,
                        lastSyncAt: result.terminal?.lastSyncAt,
                        errorMessage: result.terminal?.errorMessage,
                      }
                    : { connected: false },
                );
                console.log(
                  "🔵 [FRONTEND] Set terminalStatus state:",
                  result.connected ? "CONNECTED" : "NOT CONNECTED",
                );
              })
              .catch((error) => {
                console.error(
                  "🔴 [FRONTEND] Error fetching Terminal status:",
                  error,
                );
              })
              .finally(() => setTerminalLoading(false));
          } else {
            console.log(
              "🔵 [FRONTEND] Skipping status fetch - open:",
              open,
              "selectedAccount:",
              !!selectedAccount,
            );
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] bg-void-surface border-white/10">
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
                    const status = await getTerminalStatusByPropAccount(selectedAccount.id);
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
            // Not Connected - Show Connection Form
            <div className="space-y-4 py-4">
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
              </div>

              {mt5Error && <p className="text-sm text-red-400">{mt5Error}</p>}

              <DialogFooter>
                <button
                  className="bg-transparent border border-white/10 hover:bg-white/5 rounded-lg w-full py-2.5 flex items-center justify-center gap-2"
                  onClick={async () => {
                    if (!selectedAccount) return;
                    setTerminalLoading(true);
                    setMt5Error(null);
                    try {
                      // 1. Create MT5 account
                      const createResult = await createMT5Account({
                        propAccountId: selectedAccount.id,
                        server: mt5FormData.server,
                        login: mt5FormData.login,
                        password: mt5FormData.password,
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
                      setTerminalStatus(
                        status.connected
                          ? {
                              connected: true,
                              terminalId: status.terminal?.terminalId,
                              status: status.terminal?.status,
                              lastHeartbeat: status.terminal?.lastHeartbeat,
                              lastSyncAt: status.terminal?.lastSyncAt,
                              errorMessage: status.terminal?.errorMessage,
                            }
                          : { connected: false },
                      );

                      setMt5FormData({ server: "", login: "", password: "" });
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
                </button>
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
