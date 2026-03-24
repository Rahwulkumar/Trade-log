"use client";

import type {
  CSSProperties,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";

import type { TerminalStatusByPropAccountResult } from "@/lib/api/terminal-farm";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppMetricCard,
  AppPanel,
  AppStatList,
  PanelTitle,
} from "@/components/ui/page-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ValueBar } from "@/components/ui/control-primitives";
import { InsetPanel, ListItemRow } from "@/components/ui/surface-primitives";

type AddFormState = {
  firmName: string;
  phaseType: "2-phase" | "1-phase" | "zero-phase";
  startingBalance: string;
};

interface PropAccountCardProps {
  name: string;
  firm?: string | null;
  phase?: string | null;
  status: string;
  currentBalance: number;
  initialBalance: number;
  dailyDrawdownCurrent?: number | null;
  dailyDrawdownLimitPercent?: number | null;
  deleting?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

interface ThresholdMeterProps {
  label: string;
  currentValue: number;
  limitValue: number;
  helper: string;
}

interface TerminalStatusPanelProps {
  terminalStatus: TerminalStatusByPropAccountResult;
  action?: ReactNode;
}

interface AddPropAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  addForm: AddFormState;
  setAddForm: Dispatch<SetStateAction<AddFormState>>;
  formError: string | null;
  isSubmitting: boolean;
}

interface DeletePropAccountDialogProps {
  open: boolean;
  accountName: string;
  deleting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

interface Mt5SyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminalLoading: boolean;
  terminalStatus: TerminalStatusByPropAccountResult | null;
  mt5Error: string | null;
  selectedAccountName: string | null;
  selectedAccountSize: number;
  mt5FormData: {
    server: string;
    login: string;
    password: string;
    currentBalance: string;
  };
  setMt5FormData: Dispatch<
    SetStateAction<{
      server: string;
      login: string;
      password: string;
      currentBalance: string;
    }>
  >;
  onConnect: () => void;
  onReset: () => void;
  onDisable: () => void;
}

function formatMoney(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function formatSignedMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString()}`;
}

function getThresholdColor(ratio: number) {
  if (ratio >= 0.85) return "var(--loss-primary)";
  if (ratio >= 0.6) return "var(--warning-primary)";
  return "var(--accent-primary)";
}

function getStatusChipStyles(status: string): CSSProperties {
  if (status === "active") {
    return {
      background: "var(--profit-bg)",
      color: "var(--profit-primary)",
      borderColor: "color-mix(in srgb, var(--profit-primary) 18%, transparent)",
    };
  }

  return {
    background: "var(--surface-elevated)",
    color: "var(--text-secondary)",
    borderColor: "var(--border-subtle)",
  };
}

export function PropAccountCard({
  name,
  firm,
  phase,
  status,
  currentBalance,
  initialBalance,
  dailyDrawdownCurrent,
  dailyDrawdownLimitPercent,
  deleting = false,
  onSelect,
  onDelete,
}: PropAccountCardProps) {
  const pnl = currentBalance - initialBalance;
  const ddRatio =
    dailyDrawdownLimitPercent && dailyDrawdownLimitPercent > 0
      ? Math.min(
          Math.max((dailyDrawdownCurrent ?? 0) / dailyDrawdownLimitPercent, 0),
          1,
        )
      : 0;
  const statusStyles = getStatusChipStyles(status);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="rounded-[var(--radius-lg)] outline-none transition-transform focus-visible:ring-2"
      style={{ outlineColor: "var(--accent-primary)" }}
    >
      <AppPanel className="h-full p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="headline-md truncate">{name}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {[firm, phase].filter(Boolean).join(" / ") || "No firm details yet"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-medium capitalize"
              style={statusStyles}
            >
              {status}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={deleting}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              aria-label={`Delete ${name}`}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <AppMetricCard
            label="Balance"
            value={formatMoney(currentBalance)}
            tone="default"
            shell="elevated"
          />
          <AppMetricCard
            label="Profit / Loss"
            value={formatSignedMoney(pnl)}
            tone={pnl >= 0 ? "profit" : "loss"}
            shell="elevated"
          />
        </div>

        {dailyDrawdownLimitPercent ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-tertiary)" }}>Daily drawdown</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {(dailyDrawdownCurrent ?? 0).toFixed(1)}% /{" "}
                {dailyDrawdownLimitPercent.toFixed(1)}%
              </span>
            </div>
            <ValueBar value={ddRatio * 100} color={getThresholdColor(ddRatio)} />
          </div>
        ) : null}
      </AppPanel>
    </div>
  );
}

export function ThresholdMeter({
  label,
  currentValue,
  limitValue,
  helper,
}: ThresholdMeterProps) {
  const normalizedLimit = Math.max(limitValue, 0);
  const normalizedCurrent = Math.max(currentValue, 0);
  const ratio =
    normalizedLimit > 0
      ? Math.min(normalizedCurrent / normalizedLimit, 1)
      : 0;

  return (
    <InsetPanel className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {label}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {helper}
          </p>
        </div>
        <p className="mono text-sm" style={{ color: "var(--text-primary)" }}>
          {normalizedCurrent.toFixed(1)}% / {normalizedLimit.toFixed(1)}%
        </p>
      </div>

      <ValueBar value={ratio * 100} color={getThresholdColor(ratio)} />

      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {(normalizedLimit - normalizedCurrent).toFixed(1)}% remaining
      </p>
    </InsetPanel>
  );
}

export function TerminalStatusPanel({
  terminalStatus,
  action,
}: TerminalStatusPanelProps) {
  const items = [
    {
      label: "Terminal status",
      value: terminalStatus.terminal?.status ?? "NOT_LINKED",
      tone: terminalStatus.connected ? ("profit" as const) : ("warning" as const),
    },
    {
      label: "MT5 account",
      value: terminalStatus.mt5Account
        ? `${terminalStatus.mt5Account.server} / ${terminalStatus.mt5Account.login}`
        : "Not linked",
    },
    {
      label: "Terminal ID",
      value: terminalStatus.terminal?.terminalId ?? "Awaiting assignment",
    },
    {
      label: "Live positions",
      value: String(terminalStatus.livePositions.length),
      tone: terminalStatus.livePositions.length > 0 ? ("accent" as const) : undefined,
    },
  ];

  return (
    <InsetPanel tone={terminalStatus.connected ? "profit" : "warning"} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <PanelTitle
          title="MT5 Sync"
          subtitle={
            terminalStatus.connected
              ? "Terminal connected and reporting live state."
              : "Terminal not currently connected."
          }
          className="mb-0"
        />
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <AppStatList items={items} />

      {terminalStatus.diagnostics?.message ? (
        <InsetPanel paddingClassName="px-3 py-3">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {terminalStatus.diagnostics.message}
          </p>
        </InsetPanel>
      ) : null}

      {terminalStatus.livePositions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-label" style={{ color: "var(--text-secondary)" }}>
            Live Positions
          </p>
          {terminalStatus.livePositions.map((position) => (
            <ListItemRow
              key={`${position.ticket}-${position.positionId ?? "live"}`}
              leading={
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {position.symbol} {position.type}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {position.volume} lots at {position.openPrice}
                  </p>
                </div>
              }
              trailing={
                <div className="text-right">
                  <p
                    className={cn(
                      "mono text-sm font-semibold",
                      position.profit >= 0 ? "profit" : "loss",
                    )}
                  >
                    {formatMoney(position.profit)}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Current: {position.currentPrice}
                  </p>
                </div>
              }
            />
          ))}
        </div>
      ) : null}
    </InsetPanel>
  );
}

export function AddPropAccountDialog({
  open,
  onOpenChange,
  onSubmit,
  addForm,
  setAddForm,
  formError,
  isSubmitting,
}: AddPropAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Prop Account</DialogTitle>
            <DialogDescription>
              Track your prop challenge or funded account in the same account system used by the dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-firm">Prop firm name</Label>
              <Input
                id="add-firm"
                placeholder="e.g. FTMO, Funding Pips, The5ers"
                value={addForm.firmName}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    firmName: event.target.value,
                  }))
                }
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-phase">Phase type</Label>
              <Select
                value={addForm.phaseType}
                onValueChange={(value: "2-phase" | "1-phase" | "zero-phase") =>
                  setAddForm((current) => ({ ...current, phaseType: value }))
                }
              >
                <SelectTrigger id="add-phase">
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
              <Label htmlFor="add-balance">Starting balance ($)</Label>
              <Input
                id="add-balance"
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 10000"
                value={addForm.startingBalance}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    startingBalance: event.target.value,
                  }))
                }
              />
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Enter the account size so balance and drawdown tracking start from the correct baseline.
              </p>
            </div>
          </div>

          {formError ? (
            <p className="pb-2 text-sm" style={{ color: "var(--loss-primary)" }}>
              {formError}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !addForm.firmName.trim() ||
                !addForm.startingBalance.trim()
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeletePropAccountDialog({
  open,
  accountName,
  deleting,
  onConfirm,
  onOpenChange,
}: DeletePropAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete account?</DialogTitle>
          <DialogDescription>
            <strong style={{ color: "var(--text-primary)" }}>{accountName}</strong> will be deleted along with any linked MT5 connection. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={deleting} onClick={onConfirm}>
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Mt5SyncDialog({
  open,
  onOpenChange,
  terminalLoading,
  terminalStatus,
  mt5Error,
  selectedAccountName,
  selectedAccountSize,
  mt5FormData,
  setMt5FormData,
  onConnect,
  onReset,
  onDisable,
}: Mt5SyncDialogProps) {
  const terminalItems = terminalStatus
    ? [
        {
          label: "Last heartbeat",
          value: terminalStatus.terminal?.lastHeartbeat
            ? new Date(terminalStatus.terminal.lastHeartbeat).toLocaleString()
            : "Never",
        },
        {
          label: "Last trade sync",
          value: terminalStatus.terminal?.lastSyncAt
            ? new Date(terminalStatus.terminal.lastSyncAt).toLocaleString()
            : "Never",
        },
        {
          label: "Diagnostic code",
          value: terminalStatus.diagnostics?.code ?? "NO_HEARTBEAT",
        },
        {
          label: "Live positions",
          value: String(terminalStatus.livePositions.length),
          tone:
            terminalStatus.livePositions.length > 0
              ? ("accent" as const)
              : undefined,
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" style={{ color: "var(--accent-primary)" }} />
            Connect MetaTrader 5
          </DialogTitle>
          <DialogDescription>
            Inspect terminal status, reconnect MT5 credentials, and manage the live sync for{" "}
            <span style={{ color: "var(--text-primary)" }}>
              {selectedAccountName ?? "this account"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {terminalLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--text-tertiary)" }} />
          </div>
        ) : terminalStatus?.connected ? (
          <div className="space-y-4 py-2">
            <InsetPanel tone="profit" className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5"
                  style={{ color: "var(--profit-primary)" }}
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Terminal connected
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Terminal ID:{" "}
                    <span className="mono" style={{ color: "var(--text-primary)" }}>
                      {terminalStatus.terminal?.terminalId ?? "Unknown"}
                    </span>
                  </p>
                </div>
              </div>
            </InsetPanel>

            <InsetPanel className="space-y-3">
              <AppStatList items={terminalItems} />
              {terminalStatus.diagnostics?.message ? (
                <InsetPanel paddingClassName="px-3 py-3">
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {terminalStatus.diagnostics.message}
                  </p>
                </InsetPanel>
              ) : null}
            </InsetPanel>

            {terminalStatus.livePositions.length > 0 ? (
              <InsetPanel className="space-y-2">
                <p className="text-label" style={{ color: "var(--text-secondary)" }}>
                  Live Positions
                </p>
                {terminalStatus.livePositions.map((position) => (
                  <ListItemRow
                    key={`${position.ticket}-${position.positionId ?? "live"}`}
                    leading={
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {position.symbol} {position.type}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {position.volume} lots at {position.openPrice}
                        </p>
                      </div>
                    }
                    trailing={
                      <div className="text-right">
                        <p
                          className={cn(
                            "mono text-sm font-semibold",
                            position.profit >= 0 ? "profit" : "loss",
                          )}
                        >
                          {formatMoney(position.profit)}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                          Current: {position.currentPrice}
                        </p>
                      </div>
                    }
                  />
                ))}
              </InsetPanel>
            ) : null}

            {mt5Error ? (
              <p className="text-sm" style={{ color: "var(--loss-primary)" }}>
                {mt5Error}
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" onClick={onDisable}>
                Disable Auto-Sync
              </Button>
              <Button variant="ghost" onClick={onReset}>
                Reset MT5 Sync
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {terminalStatus?.mt5Account ? (
              <InsetPanel className="space-y-2">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Saved MT5 account
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Server:{" "}
                  <span className="mono" style={{ color: "var(--text-primary)" }}>
                    {terminalStatus.mt5Account.server}
                  </span>{" "}
                  / Login:{" "}
                  <span className="mono" style={{ color: "var(--text-primary)" }}>
                    {terminalStatus.mt5Account.login}
                  </span>
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Terminal ID:{" "}
                  <span
                    className="mono"
                    style={{ color: "var(--text-primary)", wordBreak: "break-all" }}
                  >
                    {terminalStatus.terminal?.terminalId ?? "Awaiting assignment"}
                  </span>
                </p>
                {terminalStatus.diagnostics?.message ? (
                  <InsetPanel paddingClassName="px-3 py-3">
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      <span className="mono" style={{ color: "var(--text-primary)" }}>
                        {terminalStatus.diagnostics.code}
                      </span>{" "}
                      / {terminalStatus.diagnostics.message}
                    </p>
                  </InsetPanel>
                ) : null}
              </InsetPanel>
            ) : null}

            <InsetPanel tone="accent">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5" style={{ color: "var(--accent-primary)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Account size baseline
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    This prop account is tracking against{" "}
                    <span className="mono" style={{ color: "var(--text-primary)" }}>
                      {formatMoney(selectedAccountSize)}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </InsetPanel>

            <div className="space-y-3">
              <div>
                <Label htmlFor="mt5-server">Server</Label>
                <Input
                  id="mt5-server"
                  className="mt-1"
                  placeholder="e.g. ICMarketsSC-Demo"
                  value={mt5FormData.server}
                  onChange={(event) =>
                    setMt5FormData((current) => ({
                      ...current,
                      server: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="mt5-login">Login</Label>
                <Input
                  id="mt5-login"
                  className="mt-1"
                  placeholder="Your MT5 account number"
                  value={mt5FormData.login}
                  onChange={(event) =>
                    setMt5FormData((current) => ({
                      ...current,
                      login: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="mt5-password">Password</Label>
                <Input
                  id="mt5-password"
                  type="password"
                  className="mt-1"
                  placeholder="Your MT5 investor password"
                  value={mt5FormData.password}
                  onChange={(event) =>
                    setMt5FormData((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="mt5-balance">Current account balance (optional)</Label>
                <Input
                  id="mt5-balance"
                  type="number"
                  min="0"
                  step="1"
                  className="mt-1"
                  placeholder="e.g. 10000"
                  value={mt5FormData.currentBalance}
                  onChange={(event) =>
                    setMt5FormData((current) => ({
                      ...current,
                      currentBalance: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {mt5Error ? (
              <p className="text-sm" style={{ color: "var(--loss-primary)" }}>
                {mt5Error}
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:justify-between">
              {terminalStatus?.mt5AccountId ? (
                <Button variant="outline" onClick={onReset}>
                  Reset MT5 Sync
                </Button>
              ) : (
                <div />
              )}
              <Button
                onClick={onConnect}
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
                    {terminalStatus?.mt5AccountId ? "Reconnecting..." : "Connecting..."}
                  </>
                ) : terminalStatus?.mt5AccountId ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Reconnect MT5
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4" />
                    Enable Auto-Sync
                  </>
                )}
              </Button>
            </DialogFooter>

            <p className="text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
              Terminal Farm runs MT5 in Docker and exposes terminal state, diagnostics, and live positions directly in the app.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SyncUnavailableCallout({
  message,
}: {
  message: string;
}) {
  return (
    <InsetPanel tone="warning">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5"
          style={{ color: "var(--warning-primary)" }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Sync attention needed
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {message}
          </p>
        </div>
      </div>
    </InsetPanel>
  );
}
