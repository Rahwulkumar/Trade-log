
"use client";


import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { getPropAccounts, createPropAccount, deletePropAccount, checkCompliance, type ComplianceStatus } from "@/lib/api/prop-accounts";
import { getPropFirms, getFirmChallenges, createAccountFromChallenge } from "@/lib/api/prop-firms";
import type { PropFirm, PropFirmChallenge } from "@/lib/types/prop-firms";
import { PropFirmWidget } from "@/components/dashboard/prop-firm-widget";

import { Plus, Trash2, LayoutDashboard, Settings2, Loader2, Zap, Calendar, BarChart3, Shield, CheckCircle2, AlertTriangle, RefreshCw, Download, Copy, Link, CloudOff, Cloud } from "lucide-react";
import { connectMT5, getMT5Status, syncMT5, disconnectMT5 } from "@/lib/api/mt5";
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


// Popular firm presets with their typical rules
const FIRM_PRESETS = [
  { 
    name: "FTMO", 
    daily_dd: 5, 
    total_dd: 10, 
    profit_target_phase1: 10,
    profit_target_phase2: 5,
    challenge_types: ["2-Phase", "1-Phase"]
  },
  { 
    name: "MyForexFunds", 
    daily_dd: 5, 
    total_dd: 12, 
    profit_target_phase1: 8,
    profit_target_phase2: 5,
    challenge_types: ["2-Phase", "1-Phase", "Rapid"]
  },
  { 
    name: "The Funded Trader", 
    daily_dd: 5, 
    total_dd: 10, 
    profit_target_phase1: 10,
    profit_target_phase2: 5,
    challenge_types: ["2-Phase", "1-Phase", "Rapid"]
  },
  { 
    name: "True Forex Funds", 
    daily_dd: 4, 
    total_dd: 8, 
    profit_target_phase1: 8,
    profit_target_phase2: 4,
    challenge_types: ["2-Phase", "1-Phase"]
  },
  { 
    name: "Funded Next", 
    daily_dd: 5, 
    total_dd: 10, 
    profit_target_phase1: 10,
    profit_target_phase2: 5,
    challenge_types: ["2-Phase", "1-Phase", "Express"]
  },
  { 
    name: "E8 Funding", 
    daily_dd: 5, 
    total_dd: 8, 
    profit_target_phase1: 8,
    profit_target_phase2: 4,
    challenge_types: ["2-Phase", "1-Phase"]
  },
  { 
    name: "Other", 
    daily_dd: 5, 
    total_dd: 10, 
    profit_target_phase1: 10,
    profit_target_phase2: 5,
    challenge_types: ["2-Phase", "1-Phase", "Instant Funded"]
  },
];

const CHALLENGE_TYPES = ["1-Phase", "2-Phase", "Instant Funded", "Direct Funded"];
const PHASE_OPTIONS = ["Phase 1 (Evaluation)", "Phase 2 (Verification)", "Funded"];

export default function PropFirmPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId, setSelectedAccountId } = usePropAccount();
  const [accounts, setAccounts] = useState<PropAccountWithCompliance[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PropAccountWithCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  
  // MT5 Cloud Integration State
  const [mt5Connection, setMt5Connection] = useState<{
    connected: boolean;
    id?: string;
    server?: string;
    login?: string;
    status?: string;
    lastSyncedAt?: string | null;
    syncsRemaining?: number;
    syncLimit?: number;
    errorMessage?: string | null;
  } | null>(null);
  const [mt5Loading, setMt5Loading] = useState(false);
  const [mt5FormData, setMt5FormData] = useState({ server: '', login: '', password: '' });
  const [mt5Error, setMt5Error] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Custom input mode flags
  const [isCustomFirm, setIsCustomFirm] = useState(false);
  const [isCustomBalance, setIsCustomBalance] = useState(false);

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
        getFirmChallenges(selectedFirmId).then(setChallenges).catch(console.error);
    } else {
        setChallenges([]);
    }
  }, [selectedFirmId]);

  // Auto-fill form details when challenge selected
  useEffect(() => {
    if (selectedChallengeId) {
        const challenge = challenges.find(c => c.id === selectedChallengeId);
        if (challenge) {
            // Auto-generate a name if empty
            if (!formData.name) {
                setFormData(prev => ({ ...prev, name: `${challenge.name} - ${challenge.phase_name}` }));
            }
        }
    }
  }, [selectedChallengeId, challenges]);


  async function loadAccounts() {
    if (!isConfigured || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const accountsData = await getPropAccounts();
      
      // Get compliance for each account
      const accountsWithCompliance = await Promise.all(
        accountsData.map(async (account) => {
          const compliance = await checkCompliance(account.id);
          return { ...account, compliance };
        })
      );
      
      setAccounts(accountsWithCompliance);
      
      // Determine which account to show based on global selection or default to first
      if (selectedAccountId && selectedAccountId !== "unassigned") {
        const found = accountsWithCompliance.find(a => a.id === selectedAccountId);
        if (found) setSelectedAccount(found);
        else if (accountsWithCompliance.length > 0) setSelectedAccount(accountsWithCompliance[0]);
      } else if (accountsWithCompliance.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsWithCompliance[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  // Update selected account when global ID changes
  useEffect(() => {
    if (accounts.length > 0) {
      if (selectedAccountId && selectedAccountId !== "unassigned") {
        const found = accounts.find(a => a.id === selectedAccountId);
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
  }, [user, isConfigured, authLoading]);

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
          startDate: formData.start_date
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
    if (!confirm("Are you sure you want to delete this account?")) return;

    try {
      await deletePropAccount(id);
      setSelectedAccount(null);
      if (selectedAccountId === id) setSelectedAccountId(null);
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
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
        <div className="card-void p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Supabase Not Configured</h2>
          <p className="text-muted-foreground">Please add your Supabase credentials.</p>
        </div>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card-void p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to manage your prop accounts.</p>
          <a href="/auth/login" className="btn-glow">Sign In</a>
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
          <button className="btn-void p-2" onClick={loadAccounts} title="Refresh">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <Dialog open={isNewAccountOpen} onOpenChange={setIsNewAccountOpen}>
            <DialogTrigger asChild>
              <button className="btn-glow">
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
                      <Select value={selectedFirmId} onValueChange={setSelectedFirmId}>
                        <SelectTrigger className="bg-void border-white/10">
                            <SelectValue placeholder="Select Prop Firm" />
                        </SelectTrigger>
                        <SelectContent>
                            {firms.map(firm => (
                                <SelectItem key={firm.id} value={firm.id}>{firm.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                  </div>
                  
                  {selectedFirmId && (
                      <div className="space-y-2">
                        <Label>Challenge / Phase</Label>
                        <Select value={selectedChallengeId} onValueChange={setSelectedChallengeId}>
                            <SelectTrigger className="bg-void border-white/10">
                                <SelectValue placeholder="Select Challenge" />
                            </SelectTrigger>
                            <SelectContent>
                                {challenges.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name} - {c.phase_name} (${c.initial_balance.toLocaleString()})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </div>
                  )}

                  {selectedChallengeId && (() => {
                      const challenge = challenges.find(c => c.id === selectedChallengeId);
                      if (!challenge) return null;
                      return (
                          <div className="p-4 rounded-lg bg-void border border-white/5 space-y-3">
                              <h4 className="text-sm font-medium text-muted-foreground mb-2">Challenge Rules</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                      <span className="text-muted-foreground block text-xs">Initial Balance</span>
                                      <span className="font-mono text-green-400">${challenge.initial_balance.toLocaleString()}</span>
                                  </div>
                                  <div>
                                      <span className="text-muted-foreground block text-xs">Profit Target</span>
                                      <span className="font-mono text-blue-400">
                                          {challenge.profit_target_percent ? `${challenge.profit_target_percent}%` : 'None'}
                                      </span>
                                  </div>
                                  <div>
                                      <span className="text-muted-foreground block text-xs">Daily Loss Limit</span>
                                      <span className="font-mono text-red-400">
                                          {challenge.daily_loss_percent ? `${challenge.daily_loss_percent}%` : (challenge.daily_loss_amount ? `$${challenge.daily_loss_amount.toLocaleString()}` : '-')}
                                      </span>
                                  </div>
                                  <div>
                                      <span className="text-muted-foreground block text-xs">Max Loss Limit</span>
                                      <span className="font-mono text-red-500">
                                          {challenge.max_loss_percent ? `${challenge.max_loss_percent}%` : (challenge.max_loss_amount ? `$${challenge.max_loss_amount.toLocaleString()}` : '-')}
                                      </span>
                                  </div>
                                  <div className="col-span-2">
                                      <span className="text-muted-foreground block text-xs">Drawdown Type</span>
                                      <span className="capitalize">{challenge.drawdown_type}</span>
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
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input 
                      type="date" 
                      className="bg-void border-white/10"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button type="button" className="btn-void" onClick={() => setIsNewAccountOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-glow" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Account"}
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
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
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
        <div className="card-void p-12 text-center">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No prop accounts yet. Add one to start tracking!</p>
          <button className="btn-glow" onClick={() => setIsNewAccountOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Your First Account
          </button>
        </div>
      )}

      {/* All Accounts Summary Grid */}
      {!loading && !selectedAccount && accounts.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map(account => (
            <div 
              key={account.id} 
              className="card-glow p-6 cursor-pointer hover:border-blue-500/50 transition-all group"
              onClick={() => handleAccountChange(account.id)}
            >
              <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-blue-400 transition-colors">{account.name}</h3>
                    <p className="text-sm text-muted-foreground">{account.firm} • {account.phase}</p>
                  </div>
                  <span className={cn(
                    "badge-void px-2 py-0.5 text-xs capitalize",
                    account.status === "active" ? "text-green-400 border-green-400/20" : "text-muted-foreground"
                  )}>
                    {account.status}
                  </span>
              </div>
              
              <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-mono text-lg">${account.current_balance.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Profit/Loss</span>
                    <span className={cn(
                      "font-mono font-medium",
                      account.current_balance >= account.initial_balance ? "text-green-400" : "text-red-400"
                    )}>
                        {account.current_balance >= account.initial_balance ? "+" : ""}
                        ${(account.current_balance - account.initial_balance).toLocaleString()}
                    </span>
                  </div>

                  {/* Drawdown Progress Mini */}
                  {account.daily_dd_max && (
                    <div className="space-y-1 pt-2 border-t border-white/5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Daily DD</span>
                        <span className={account.daily_dd_current > (account.daily_dd_max * 0.8) ? "text-red-400" : "text-muted-foreground"}>
                          {account.daily_dd_current.toFixed(1)}% / {account.daily_dd_max}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", getStatusColor(account.daily_dd_current, account.daily_dd_max))} 
                          style={{ width: `${(account.daily_dd_current / account.daily_dd_max) * 100}%` }} 
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
                  <p className="text-sm text-muted-foreground">{selectedAccount.firm} • {selectedAccount.phase}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-void text-xs px-3 py-1 flex items-center gap-2 border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => {
                    console.log('🟢 [BUTTON] Sync MT5 clicked, selectedAccount:', selectedAccount?.id);
                    setIsSyncDialogOpen(true);
                    
                    // Fetch status immediately since onOpenChange doesn't fire on open
                    if (selectedAccount) {
                      console.log('🟢 [BUTTON] Fetching MT5 status for account:', selectedAccount.id);
                      setMt5Loading(true);
                      setMt5Error(null);
                      getMT5Status(selectedAccount.id).then((result) => {
                        console.log('🟢 [BUTTON] MT5 status result:', { connected: result.connected, connectionId: result.connection?.id });
                        setMt5Connection(result.connected ? {
                          connected: true,
                          id: result.connection?.id,
                          server: result.connection?.server,
                          login: result.connection?.login,
                          status: result.connection?.status,
                          lastSyncedAt: result.connection?.lastSyncedAt,
                          syncsRemaining: result.connection?.syncsRemaining,
                          syncLimit: result.connection?.syncLimit,
                          errorMessage: result.connection?.errorMessage,
                        } : { connected: false });
                        console.log('🟢 [BUTTON] Set mt5Connection state:', result.connected ? 'CONNECTED' : 'NOT CONNECTED');
                      }).catch((error) => {
                        console.error('🔴 [BUTTON] Error fetching MT5 status:', error);
                        setMt5Error('Failed to check connection status');
                      }).finally(() => setMt5Loading(false));
                    }
                  }}
                >
                    <Download className="h-3 w-3" />
                    Sync MT5
                </button>
                <span className={cn(
                  "badge-void px-3 py-1",
                  selectedAccount.compliance?.isCompliant 
                    ? "text-green-400 border-green-400/20 bg-green-400/10" 
                    : "text-red-400 border-red-400/20 bg-red-400/10"
                )}>
                  {selectedAccount.compliance?.isCompliant ? (
                    <><CheckCircle2 className="h-4 w-4 mr-1 inline" /> Compliant</>
                  ) : (
                    <><AlertTriangle className="h-4 w-4 mr-1 inline" /> At Risk</>
                  )}
                </span>
                <button 
                  className="p-2 hover:bg-red-500/10 rounded text-red-400"
                  onClick={() => handleDelete(selectedAccount.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Account Balance */}
            <div className="flex justify-between items-center p-4 rounded-lg bg-white/[0.02] border border-white/5 mb-6">
              <div>
                <p className="text-label">Current Balance</p>
                <p className="stat-huge mt-1">${selectedAccount.current_balance.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-label">Profit/Loss</p>
                <p className={cn("stat-large mt-1", selectedAccount.current_balance >= selectedAccount.initial_balance ? "profit" : "loss")}>
                  {selectedAccount.current_balance >= selectedAccount.initial_balance ? "+" : ""}
                  ${(selectedAccount.current_balance - selectedAccount.initial_balance).toLocaleString()}
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
                    <span className="text-sm">{selectedAccount.daily_dd_current.toFixed(1)}% / {selectedAccount.daily_dd_max}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all", getStatusColor(selectedAccount.daily_dd_current, selectedAccount.daily_dd_max))} 
                      style={{ width: `${(selectedAccount.daily_dd_current / selectedAccount.daily_dd_max) * 100}%` }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(selectedAccount.daily_dd_max - selectedAccount.daily_dd_current).toFixed(1)}% remaining
                  </p>
                </div>
              )}

              {/* Total Drawdown */}
              {selectedAccount.total_dd_max && (
                <div className="space-y-3 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Drawdown</span>
                    <span className="text-sm">{selectedAccount.total_dd_current.toFixed(1)}% / {selectedAccount.total_dd_max}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all", getStatusColor(selectedAccount.total_dd_current, selectedAccount.total_dd_max))} 
                      style={{ width: `${(selectedAccount.total_dd_current / selectedAccount.total_dd_max) * 100}%` }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(selectedAccount.total_dd_max - selectedAccount.total_dd_current).toFixed(1)}% remaining
                  </p>
                </div>
              )}
            </div>

            {/* Profit Target */}
            {selectedAccount.profit_target && selectedAccount.compliance?.profitProgress !== null && (
              <div className="space-y-3 p-4 rounded-lg bg-white/[0.02] border border-white/5 mt-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Profit Target</span>
                  <span className="text-sm">
                    {(selectedAccount.compliance?.profitProgress || 0).toFixed(1)}% / {selectedAccount.profit_target}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" 
                    style={{ width: `${Math.min((selectedAccount.compliance?.profitProgress || 0) / selectedAccount.profit_target * 100, 100)}%` }} 
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {(selectedAccount.profit_target - (selectedAccount.compliance?.profitProgress || 0)).toFixed(1)}% more to reach target
                </p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="card-void p-6">
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
            <div className="card-void p-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Initial Balance</p>
                  <p className="text-xs text-muted-foreground">${selectedAccount.initial_balance.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="card-void p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className={cn(
                    "text-xs",
                    selectedAccount.status === "active" ? "text-green-400" : "text-muted-foreground"
                  )}>
                    {selectedAccount.status.charAt(0).toUpperCase() + selectedAccount.status.slice(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* MT5 Cloud Sync Dialog */}
      <Dialog open={isSyncDialogOpen} onOpenChange={(open) => {
        console.log('🔵 [FRONTEND] Dialog onOpenChange:', { open, hasSelectedAccount: !!selectedAccount, selectedAccountId: selectedAccount?.id });
        setIsSyncDialogOpen(open);
        if (open && selectedAccount) {
          console.log('🔵 [FRONTEND] Fetching MT5 status for account:', selectedAccount.id);
          // Fetch connection status when dialog opens
          setMt5Loading(true);
          getMT5Status(selectedAccount.id).then((result) => {
            console.log('🔵 [FRONTEND] MT5 status result:', { connected: result.connected, connectionId: result.connection?.id });
            setMt5Connection(result.connected ? {
              connected: true,
              id: result.connection?.id,
              server: result.connection?.server,
              login: result.connection?.login,
              status: result.connection?.status,
              lastSyncedAt: result.connection?.lastSyncedAt,
              syncsRemaining: result.connection?.syncsRemaining,
              syncLimit: result.connection?.syncLimit,
              errorMessage: result.connection?.errorMessage,
            } : { connected: false });
            console.log('🔵 [FRONTEND] Set mt5Connection state:', result.connected ? 'CONNECTED' : 'NOT CONNECTED');
          }).catch((error) => {
            console.error('🔴 [FRONTEND] Error fetching MT5 status:', error);
          }).finally(() => setMt5Loading(false));
        } else {
          console.log('🔵 [FRONTEND] Skipping status fetch - open:', open, 'selectedAccount:', !!selectedAccount);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] bg-void-surface border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-400" />
              Connect MetaTrader 5
            </DialogTitle>
            <DialogDescription>
              Sync your trades automatically via cloud. No software installation required.
            </DialogDescription>
          </DialogHeader>
          
          {mt5Loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : mt5Connection?.connected ? (
            // Connected State - Show Sync UI
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Connected</p>
                    <p className="text-xs text-muted-foreground">
                      {mt5Connection.server} | Login: {mt5Connection.login}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sync Status */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Synced</span>
                  <span className="text-white">
                    {mt5Connection.lastSyncedAt 
                      ? new Date(mt5Connection.lastSyncedAt).toLocaleDateString() 
                      : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Syncs Remaining</span>
                  <span className="text-white">
                    {mt5Connection.syncsRemaining} / {mt5Connection.syncLimit}
                  </span>
                </div>
                {mt5Connection.errorMessage && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    {mt5Connection.errorMessage}
                  </div>
                )}
              </div>

              {/* Sync Button */}
              <button
                className="w-full btn-void py-3 flex items-center justify-center gap-2"
                onClick={async () => {
                  if (!mt5Connection.id) return;
                  setIsSyncing(true);
                  setMt5Error(null);
                  try {
                    const result = await syncMT5(mt5Connection.id);
                    if (result.success) {
                      // Refresh status
                      const status = await getMT5Status(selectedAccount!.id);
                      setMt5Connection(status.connected ? {
                        connected: true,
                        id: status.connection?.id,
                        server: status.connection?.server,
                        login: status.connection?.login,
                        status: status.connection?.status,
                        lastSyncedAt: status.connection?.lastSyncedAt,
                        syncsRemaining: status.connection?.syncsRemaining,
                        syncLimit: status.connection?.syncLimit,
                        errorMessage: status.connection?.errorMessage,
                      } : { connected: false });
                    } else {
                      setMt5Error(result.error || 'Sync failed');
                    }
                  } catch (err) {
                    setMt5Error('Network error');
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing || (mt5Connection.syncsRemaining || 0) <= 0}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync Now
                  </>
                )}
              </button>

              {mt5Error && (
                <p className="text-sm text-red-400 text-center">{mt5Error}</p>
              )}

              {/* Disconnect Link */}
              <button
                className="text-xs text-muted-foreground hover:text-red-400 mx-auto block"
                onClick={async () => {
                  if (!mt5Connection.id) return;
                  const confirmed = confirm('Are you sure you want to disconnect this MT5 account?');
                  if (confirmed) {
                    await disconnectMT5(mt5Connection.id);
                    setMt5Connection({ connected: false });
                  }
                }}
              >
                Disconnect Account
              </button>
            </div>
          ) : (
            // Not Connected - Show Connection Form
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Enter your MT5 account credentials. Your password is encrypted and never stored in plain text.
              </p>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="mt5-server">Server</Label>
                  <Input
                    id="mt5-server"
                    placeholder="e.g., ICMarketsSC-Demo"
                    value={mt5FormData.server}
                    onChange={(e) => setMt5FormData({ ...mt5FormData, server: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mt5-login">Login</Label>
                  <Input
                    id="mt5-login"
                    placeholder="Your MT5 account number"
                    value={mt5FormData.login}
                    onChange={(e) => setMt5FormData({ ...mt5FormData, login: e.target.value })}
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
                    onChange={(e) => setMt5FormData({ ...mt5FormData, password: e.target.value })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Use the investor (read-only) password for safety.
                  </p>
                </div>
              </div>

              {mt5Error && (
                <p className="text-sm text-red-400">{mt5Error}</p>
              )}

              <DialogFooter>
                <button
                  className="btn-void w-full py-2.5 flex items-center justify-center gap-2"
                  onClick={async () => {
                    if (!selectedAccount) return;
                    setMt5Loading(true);
                    setMt5Error(null);
                    try {
                      const result = await connectMT5({
                        propAccountId: selectedAccount.id,
                        server: mt5FormData.server,
                        login: mt5FormData.login,
                        password: mt5FormData.password,
                      });
                      if (result.success) {
                        // Refresh status
                        const status = await getMT5Status(selectedAccount.id);
                        setMt5Connection(status.connected ? {
                          connected: true,
                          id: status.connection?.id,
                          server: status.connection?.server,
                          login: status.connection?.login,
                          status: status.connection?.status,
                          lastSyncedAt: status.connection?.lastSyncedAt,
                          syncsRemaining: status.connection?.syncsRemaining,
                          syncLimit: status.connection?.syncLimit,
                          errorMessage: status.connection?.errorMessage,
                        } : { connected: false });
                        setMt5FormData({ server: '', login: '', password: '' });
                      } else {
                        setMt5Error(result.error || 'Connection failed');
                      }
                    } catch (err) {
                      setMt5Error('Network error');
                    } finally {
                      setMt5Loading(false);
                    }
                  }}
                  disabled={mt5Loading || !mt5FormData.server || !mt5FormData.login || !mt5FormData.password}
                >
                  {mt5Loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4" />
                      Connect MT5
                    </>
                  )}
                </button>
              </DialogFooter>

              <p className="text-xs text-center text-muted-foreground">
                ~$3/month cost | 60 syncs/month included
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
