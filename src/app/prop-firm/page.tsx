"use client";

import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Cloud, Loader2, RefreshCw, Shield, Trash2 } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import {
  AddPropAccountDialog,
  DeletePropAccountDialog,
  Mt5SyncDialog,
  PropAccountCard,
  SyncUnavailableCallout,
  TerminalStatusPanel,
  ThresholdMeter,
} from "@/components/prop-firm/prop-firm-ui";
import { Button } from "@/components/ui/button";
import { InsetPanel } from "@/components/ui/surface-primitives";
import {
  AppMetricCard,
  AppPageHeader,
  AppPanel,
  AppPanelEmptyState,
  SectionHeader,
} from "@/components/ui/page-primitives";
import {
  LoadingMetricGrid,
  LoadingPanel,
} from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PropAccount as DrizzlePropAccount } from "@/lib/db/schema";
import {
  createPropAccount,
  deletePropAccount,
  getPropAccounts,
  recalculateAllBalances,
} from "@/lib/api/client/prop-accounts";
import {
  createMT5Account,
  disableAutoSync,
  enableAutoSync,
  getMT5Accounts,
  getTerminalStatusByPropAccount,
  resetMt5SyncByPropAccount,
  type TerminalStatusByPropAccountResult,
} from "@/lib/api/terminal-farm";

type PropAccount = DrizzlePropAccount & {
  name?: string;
  firm?: string;
  phase?: string;
  initial_balance: number;
  current_balance: number;
  daily_dd_max?: number | null;
  daily_dd_current?: number | null;
  total_dd_max?: number | null;
  total_dd_current?: number | null;
  profit_target?: number | null;
  start_date?: string | null;
};

function normalizeAccount(account: DrizzlePropAccount): PropAccount {
  return {
    ...account,
    name: account.accountName,
    firm: account.firmName ?? undefined,
    phase: account.currentPhaseStatus ?? undefined,
    initial_balance: Number(account.accountSize ?? 0),
    current_balance: Number(account.currentBalance ?? 0),
    start_date: account.startDate ?? null,
  };
}

function toPercent(
  dollarAmount: number | null | undefined,
  initialBalance: number,
): number {
  if (!dollarAmount || !initialBalance || initialBalance === 0) return 0;
  return (dollarAmount / initialBalance) * 100;
}

function getTerminalSyncKey(result: TerminalStatusByPropAccountResult) {
  return [
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
  ].join("|");
}

function formatMoney(value: number) {
  return `$${value.toLocaleString()}`;
}

function formatSignedMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString()}`;
}

export default function PropFirmPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId, setSelectedAccountId, refreshPropAccounts } =
    usePropAccount();

  const [accounts, setAccounts] = useState<PropAccount[]>([]);
  const [linkedMt5Count, setLinkedMt5Count] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [terminalStatus, setTerminalStatus] =
    useState<TerminalStatusByPropAccountResult | null>(null);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [mt5Error, setMt5Error] = useState<string | null>(null);

  const lastTerminalSyncKeyRef = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);

  const [addForm, setAddForm] = useState({
    firmName: "",
    phaseType: "2-phase" as "2-phase" | "1-phase" | "zero-phase",
    startingBalance: "",
  });
  const [mt5FormData, setMt5FormData] = useState({
    server: "",
    login: "",
    password: "",
    currentBalance: "",
  });

  const selectedAccount = useMemo(
    () =>
      selectedAccountId
        ? accounts.find((account) => account.id === selectedAccountId) ?? null
        : null,
    [accounts, selectedAccountId],
  );

  const selectedAccountKey = selectedAccount?.id ?? null;
  const deleteTargetName =
    accounts.find((account) => account.id === deleteConfirmId)?.accountName ?? "";

  const accountSummary = useMemo(() => {
    const totalBalance = accounts.reduce(
      (sum, account) => sum + account.current_balance,
      0,
    );
    const totalPnl = accounts.reduce(
      (sum, account) => sum + (account.current_balance - account.initial_balance),
      0,
    );

    return {
      totalBalance,
      totalPnl,
      activeCount: accounts.filter((account) => account.status === "active").length,
    };
  }, [accounts]);

  const selectedProfitPercent = selectedAccount
    ? Math.max(
        ((selectedAccount.current_balance - selectedAccount.initial_balance) /
          Math.max(selectedAccount.initial_balance, 1)) *
          100,
        0,
      )
    : 0;

  const loadAccounts = useCallback(async () => {
    if (!isConfigured || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [accountsData, mt5Accounts] = await Promise.all([
        getPropAccounts(),
        getMT5Accounts(),
      ]);

      const mt5LinkedIds = new Set(
        mt5Accounts
          .map((account) => account.propAccountId)
          .filter((id): id is string => Boolean(id)),
      );
      setLinkedMt5Count(mt5LinkedIds.size);

      let latestAccounts = accountsData;
      const hasNonMt5Accounts = accountsData.some(
        (account) => !mt5LinkedIds.has(account.id),
      );

      if (hasNonMt5Accounts) {
        try {
          await recalculateAllBalances();
          latestAccounts = await getPropAccounts();
        } catch (recalcError) {
          console.error("Failed to recalculate prop account balances:", recalcError);
        }
      }

      const normalizedAccounts = latestAccounts.map(normalizeAccount);
      setAccounts(normalizedAccounts);

      if (
        selectedAccountId &&
        !normalizedAccounts.some((account) => account.id === selectedAccountId)
      ) {
        setSelectedAccountId(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load prop accounts",
      );
      setAccounts([]);
      setLinkedMt5Count(0);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, selectedAccountId, setSelectedAccountId, user]);

  const refreshTerminalStatus = useCallback(
    async (
      propAccountId: string,
      options?: { reloadAccountsOnChange?: boolean },
    ) => {
      const result = await getTerminalStatusByPropAccount(propAccountId);
      setTerminalStatus(result);

      if (options?.reloadAccountsOnChange) {
        const syncKey = getTerminalSyncKey(result);
        if (syncKey !== lastTerminalSyncKeyRef.current) {
          lastTerminalSyncKeyRef.current = syncKey;
          await loadAccounts();
        }
      }

      return result;
    },
    [loadAccounts],
  );

  useEffect(() => {
    if (!authLoading) {
      void loadAccounts();
    }
  }, [authLoading, loadAccounts]);

  useEffect(() => {
    if (!selectedAccountKey) {
      setTerminalStatus(null);
      return;
    }

    refreshTerminalStatus(selectedAccountKey).catch((err) => {
      console.error("Failed to load terminal status:", err);
      setTerminalStatus(null);
    });
  }, [refreshTerminalStatus, selectedAccountKey]);

  useEffect(() => {
    lastTerminalSyncKeyRef.current = null;
  }, [selectedAccountKey]);

  useEffect(() => {
    if (!isSyncDialogOpen || !selectedAccountKey) return;

    const poll = async () => {
      try {
        await refreshTerminalStatus(selectedAccountKey, {
          reloadAccountsOnChange: true,
        });
      } catch {
        // Preserve the last visible sync state.
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [isSyncDialogOpen, refreshTerminalStatus, selectedAccountKey]);

  const handleAccountChange = (value: string) => {
    setSelectedAccountId(value === "all" ? null : value);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isSubmittingRef.current) return;

    const firm = addForm.firmName.trim();
    if (!firm) {
      setFormError("Please enter your prop firm name.");
      return;
    }

    const balanceNum = addForm.startingBalance.trim()
      ? Number(addForm.startingBalance.replace(/[^0-9.-]/g, ""))
      : Number.NaN;

    if (Number.isNaN(balanceNum) || balanceNum <= 0) {
      setFormError("Please enter a valid starting balance greater than 0.");
      return;
    }

    const accountName = `${firm} - ${addForm.phaseType}`;
    if (
      accounts.some(
        (account) =>
          account.accountName.toLowerCase() === accountName.toLowerCase(),
      )
    ) {
      setFormError(`An account named "${accountName}" already exists.`);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const newAccount = await createPropAccount({
        accountName,
        firmName: firm,
        accountSize: String(balanceNum),
        currentBalance: String(balanceNum),
        startDate: new Date().toISOString().split("T")[0],
        status: "active",
        currentPhaseStatus: addForm.phaseType,
      });

      setAddForm({ firmName: "", phaseType: "2-phase", startingBalance: "" });
      setIsNewAccountOpen(false);
      await loadAccounts();
      await refreshPropAccounts?.();
      setSelectedAccountId(newAccount.id);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create account",
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleDelete(id: string) {
    setDeleteConfirmId(id);
  }

  async function confirmDelete() {
    const id = deleteConfirmId;
    if (!id) return;

    setDeleteConfirmId(null);
    setIsDeleting(id);
    setError(null);

    try {
      await deletePropAccount(id);
      if (selectedAccountId === id) {
        setSelectedAccountId(null);
      }
      await loadAccounts();
      await refreshPropAccounts?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account";
      setError(message);
    } finally {
      setIsDeleting(null);
    }
  }

  async function handleResetMt5Sync(
    reason: "manual_reset" | "reconnect" = "manual_reset",
  ) {
    if (!selectedAccount) return false;

    setTerminalLoading(true);
    setMt5Error(null);

    try {
      const resetResult = await resetMt5SyncByPropAccount(
        selectedAccount.id,
        reason,
      );
      if (!resetResult.success) {
        setMt5Error(resetResult.error || "Failed to reset MT5 sync");
        return false;
      }

      setTerminalStatus(null);
      lastTerminalSyncKeyRef.current = null;
      await loadAccounts();
      await refreshPropAccounts?.();
      return true;
    } catch (err) {
      console.error("[ResetMt5Sync] Error:", err);
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
      const balanceStr = mt5FormData.currentBalance.trim();
      const balanceNum = balanceStr ? Number(balanceStr) : undefined;

      if (balanceNum != null && !Number.isNaN(balanceNum) && propSize > 0) {
        const diff = Math.abs(balanceNum - propSize);
        const tolerance = Math.max(propSize * 0.15, 500);
        if (diff > tolerance) {
          setMt5Error(
            `Balance $${balanceNum.toLocaleString()} doesn't match this prop account (${formatMoney(propSize)}). Use the correct prop account or update the balance.`,
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

      if (!createResult.success || !createResult.accountId) {
        setMt5Error(
          createResult.error ||
            (createResult.code === "MT5_ACCOUNT_EXISTS"
              ? "MT5 account already linked. Reset or reconnect MT5 sync first."
              : "Failed to create account"),
        );
        return;
      }

      const syncResult = await enableAutoSync(createResult.accountId);
      if (!syncResult.success) {
        setMt5Error(syncResult.error || "Failed to enable auto-sync");
        return;
      }

      await refreshTerminalStatus(selectedAccount.id, {
        reloadAccountsOnChange: true,
      });
      setMt5FormData({ server: "", login: "", password: "", currentBalance: "" });
    } catch (err) {
      console.error("[ConnectMt5] Error:", err);
      setMt5Error(err instanceof Error ? err.message : "Network error");
    } finally {
      setTerminalLoading(false);
    }
  }

  async function handleDisableAutoSync() {
    if (!selectedAccount) return;

    setTerminalLoading(true);
    setMt5Error(null);

    try {
      const status = await refreshTerminalStatus(selectedAccount.id);
      if (!status.mt5AccountId) {
        setMt5Error("MT5 account not found");
        return;
      }

      const result = await disableAutoSync(status.mt5AccountId);
      if (!result.success) {
        setMt5Error(result.error || "Failed to disable auto-sync");
        return;
      }

      setTerminalStatus({
        connected: false,
        terminal: null,
        mt5AccountId: status.mt5AccountId,
        mt5Account: status.mt5Account,
        diagnostics: status.diagnostics,
        livePositions: [],
      });
    } catch (err) {
      console.error("[DisableAutoSync] Error:", err);
      setMt5Error(err instanceof Error ? err.message : "Failed to disable auto-sync");
    } finally {
      setTerminalLoading(false);
    }
  }

  const pageActions = (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedAccount?.id ?? "all"} onValueChange={handleAccountChange}>
        <SelectTrigger className="w-full sm:w-[280px]" aria-label="Select account">
          <SelectValue
            placeholder={accounts.length === 0 ? "No accounts yet" : "Select account"}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Accounts</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {[account.name ?? account.accountName, account.phase]
                .filter(Boolean)
                .join(" - ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          void loadAccounts();
        }}
        title="Refresh"
      >
        <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      </Button>

      <AddPropAccountDialog
        open={isNewAccountOpen}
        onOpenChange={(open) => {
          setIsNewAccountOpen(open);
          if (!open) {
            setAddForm({
              firmName: "",
              phaseType: "2-phase",
              startingBalance: "",
            });
            setFormError(null);
          }
        }}
        onSubmit={handleSubmit}
        addForm={addForm}
        setAddForm={setAddForm}
        formError={formError}
        isSubmitting={isSubmitting}
      />
    </div>
  );

  if (!authLoading && !isConfigured) {
    return (
      <AppPanelEmptyState
        title="Sign-in not configured"
        description="Configure Clerk before managing prop accounts and MT5 sync."
      />
    );
  }

  if (!authLoading && !user) {
    return (
      <AppPanelEmptyState
        title="Login required"
        description="Sign in to manage your prop accounts, challenge tracking, and MT5 sync."
        action={
          <Button asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <DeletePropAccountDialog
        open={Boolean(deleteConfirmId)}
        accountName={deleteTargetName}
        deleting={Boolean(isDeleting)}
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      />

      <Mt5SyncDialog
        open={isSyncDialogOpen}
        onOpenChange={(open) => {
          setIsSyncDialogOpen(open);
          if (open && selectedAccount) {
            setTerminalLoading(true);
            setMt5Error(null);
            refreshTerminalStatus(selectedAccount.id)
              .catch((err) => {
                console.error("Failed to fetch terminal status:", err);
                setMt5Error(
                  err instanceof Error
                    ? err.message
                    : "Failed to check connection status",
                );
              })
              .finally(() => setTerminalLoading(false));
          }
        }}
        terminalLoading={terminalLoading}
        terminalStatus={terminalStatus}
        mt5Error={mt5Error}
        selectedAccountName={selectedAccount?.name ?? selectedAccount?.accountName ?? null}
        selectedAccountSize={selectedAccount?.initial_balance ?? 0}
        mt5FormData={mt5FormData}
        setMt5FormData={setMt5FormData}
        onConnect={() => {
          void handleConnectMt5();
        }}
        onReset={() => {
          void handleResetMt5Sync("manual_reset");
        }}
        onDisable={() => {
          void handleDisableAutoSync();
        }}
      />

      <AppPageHeader
        eyebrow="Prop Firm"
        title="Account Tracker"
        description="Track challenge balances, drawdown thresholds, and MT5 sync from the same account system used across the rest of the app."
        icon={<Shield size={18} strokeWidth={1.8} style={{ color: "var(--text-inverse)" }} />}
        actions={pageActions}
      />

      {error ? (
        <InsetPanel tone="loss" className="flex items-center justify-between gap-3">
          <p className="text-sm" style={{ color: "var(--loss-primary)" }}>
            {error}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadAccounts()}>
              Retry
            </Button>
          </div>
        </InsetPanel>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <LoadingMetricGrid />
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <LoadingPanel rows={5} />
            <LoadingPanel rows={4} />
          </div>
        </div>
      ) : null}

      {!loading && accounts.length === 0 ? (
        <AppPanelEmptyState
          title="No prop accounts yet"
          description="Add your first challenge or funded account to start tracking balances, drawdown, and MT5 sync."
          action={<Button onClick={() => setIsNewAccountOpen(true)}>Add Account</Button>}
        />
      ) : null}

      {!loading && accounts.length > 0 && !selectedAccount ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AppMetricCard
              label="Tracked Accounts"
              value={String(accounts.length)}
              helper="All challenge and funded accounts"
              tone="default"
            />
            <AppMetricCard
              label="Active Accounts"
              value={String(accountSummary.activeCount)}
              helper="Currently live tracking"
              tone="accent"
            />
            <AppMetricCard
              label="Tracked Balance"
              value={formatMoney(accountSummary.totalBalance)}
              helper="Combined current balance"
              tone="default"
            />
            <AppMetricCard
              label="Linked MT5"
              value={String(linkedMt5Count)}
              helper="Accounts with terminal sync"
              tone={linkedMt5Count > 0 ? "accent" : "warning"}
            />
          </section>

          <SectionHeader
            eyebrow="Overview"
            title="All Accounts"
            subtitle="Select an account to inspect drawdown, sync status, and challenge details."
          />

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => (
              <PropAccountCard
                key={account.id}
                name={account.name ?? account.accountName}
                firm={account.firm}
                phase={account.phase}
                status={account.status ?? "inactive"}
                currentBalance={account.current_balance}
                initialBalance={account.initial_balance}
                dailyDrawdownCurrent={account.daily_dd_current}
                dailyDrawdownLimitPercent={toPercent(
                  account.daily_dd_max ?? 0,
                  account.initial_balance,
                )}
                deleting={isDeleting === account.id}
                onSelect={() => handleAccountChange(account.id)}
                onDelete={() => handleDelete(account.id)}
              />
            ))}
          </section>
        </>
      ) : null}

      {!loading && selectedAccount ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AppMetricCard
              label="Current Balance"
              value={formatMoney(selectedAccount.current_balance)}
              helper="Latest tracked balance"
              tone="default"
            />
            <AppMetricCard
              label="Profit / Loss"
              value={formatSignedMoney(
                selectedAccount.current_balance - selectedAccount.initial_balance,
              )}
              helper="Versus initial balance"
              tone={
                selectedAccount.current_balance >= selectedAccount.initial_balance
                  ? "profit"
                  : "loss"
              }
            />
            <AppMetricCard
              label="Account Size"
              value={formatMoney(selectedAccount.initial_balance)}
              helper="Challenge baseline"
              tone="default"
            />
            <AppMetricCard
              label="MT5 Sync"
              value={
                terminalStatus?.connected
                  ? "Connected"
                  : terminalStatus?.mt5AccountId
                    ? "Configured"
                    : "Not Linked"
              }
              helper="Terminal Farm connection state"
              tone={
                terminalStatus?.connected
                  ? "profit"
                  : terminalStatus?.mt5AccountId
                    ? "warning"
                    : "default"
              }
              monoValue={false}
              icon={<Cloud className="h-4 w-4" />}
            />
          </section>

          <AppPanel className="space-y-6">
              <SectionHeader
                eyebrow="Account Overview"
                title={selectedAccount.name ?? selectedAccount.accountName}
                subtitle={[selectedAccount.firm, selectedAccount.phase]
                  .filter(Boolean)
                  .join(" / ")}
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedAccountId(null);
                      }}
                    >
                      All Accounts
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSyncDialogOpen(true);
                      }}
                    >
                      <Cloud className="h-4 w-4" />
                      Sync MT5
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isDeleting === selectedAccount.id}
                      onClick={() => handleDelete(selectedAccount.id)}
                      aria-label={`Delete ${selectedAccount.accountName}`}
                    >
                      {isDeleting === selectedAccount.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                }
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <AppMetricCard
                  label="Current Balance"
                  value={formatMoney(selectedAccount.current_balance)}
                  helper="Latest account balance"
                  tone="default"
                  shell="elevated"
                />
                <AppMetricCard
                  label="Profit / Loss"
                  value={formatSignedMoney(
                    selectedAccount.current_balance - selectedAccount.initial_balance,
                  )}
                  helper="Since account start"
                  tone={
                    selectedAccount.current_balance >= selectedAccount.initial_balance
                      ? "profit"
                      : "loss"
                  }
                  shell="elevated"
                />
                <AppMetricCard
                  label="Account Size"
                  value={formatMoney(selectedAccount.initial_balance)}
                  helper="Initial challenge size"
                  tone="default"
                  shell="elevated"
                />
                <AppMetricCard
                  label="Started"
                  value={
                    selectedAccount.start_date
                      ? new Date(selectedAccount.start_date).toLocaleDateString()
                      : "N/A"
                  }
                  helper="Account start date"
                  tone="default"
                  shell="elevated"
                  monoValue={false}
                />
                <AppMetricCard
                  label="Status"
                  value={
                    (selectedAccount.status ?? "inactive").charAt(0).toUpperCase() +
                    (selectedAccount.status ?? "inactive").slice(1)
                  }
                  helper="Current tracking state"
                  tone={
                    (selectedAccount.status ?? "inactive") === "active"
                      ? "profit"
                      : "default"
                  }
                  shell="elevated"
                  monoValue={false}
                />
              </div>

              {terminalStatus ? (
                <TerminalStatusPanel
                  terminalStatus={terminalStatus}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSyncDialogOpen(true)}
                    >
                      Manage Sync
                    </Button>
                  }
                />
              ) : (
                <SyncUnavailableCallout message="No MT5 connection is linked to this prop account yet. Open Sync MT5 to connect a terminal or inspect the last saved session." />
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {selectedAccount.daily_dd_max ? (
                  <ThresholdMeter
                    label="Daily Drawdown"
                    currentValue={selectedAccount.daily_dd_current ?? 0}
                    limitValue={toPercent(
                      selectedAccount.daily_dd_max,
                      selectedAccount.initial_balance,
                    )}
                    helper="Worst daily loss against the allowed drawdown."
                  />
                ) : null}

                {selectedAccount.total_dd_max ? (
                  <ThresholdMeter
                    label="Total Drawdown"
                    currentValue={selectedAccount.total_dd_current ?? 0}
                    limitValue={toPercent(
                      selectedAccount.total_dd_max,
                      selectedAccount.initial_balance,
                    )}
                    helper="Overall drawdown pressure against the challenge cap."
                  />
                ) : null}
              </div>

              {selectedAccount.profit_target ? (
                <ThresholdMeter
                  label="Profit Target"
                  currentValue={selectedProfitPercent}
                  limitValue={toPercent(
                    selectedAccount.profit_target,
                    selectedAccount.initial_balance,
                  )}
                  helper="Progress toward the configured challenge target."
                />
              ) : null}
          </AppPanel>
        </>
      ) : null}
    </>
  );
}
