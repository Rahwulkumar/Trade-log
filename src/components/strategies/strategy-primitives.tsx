import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { IconStrategies } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { InsetPanel } from "@/components/ui/surface-primitives";
import { formatSignedCurrency, toPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { StrategyCardData } from "@/lib/strategies/view-model";

type StrategyActionTone = "primary" | "secondary" | "danger" | "quiet";

export function StrategyActionButton({
  tone = "secondary",
  className,
  size,
  style,
  ...props
}: ComponentProps<typeof Button> & {
  tone?: StrategyActionTone;
}) {
  const toneStyles =
    tone === "primary"
      ? {
          background: "var(--accent-primary)",
          borderColor: "var(--accent-primary)",
          color: "#ffffff",
        }
      : tone === "danger"
        ? {
            background: "var(--loss-bg)",
            borderColor: "color-mix(in srgb, var(--loss-primary) 16%, transparent)",
            color: "var(--loss-primary)",
          }
        : tone === "quiet"
          ? {
              background: "transparent",
              borderColor: "transparent",
              color: "var(--text-secondary)",
            }
          : {
              background: "var(--surface-elevated)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
            };

  return (
    <Button
      {...props}
      size={size ?? "sm"}
      variant={tone === "quiet" ? "ghost" : "outline"}
      className={cn(
        "h-8 rounded-[10px] px-3 text-[0.76rem] font-semibold shadow-none",
        tone === "quiet" && "px-1.5 hover:bg-transparent hover:text-[var(--text-primary)]",
        className,
      )}
      style={{ ...toneStyles, ...style }}
    />
  );
}

export function StrategyStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold"
      style={{
        background: isActive ? "var(--accent-soft)" : "var(--surface)",
        color: isActive ? "var(--accent-primary)" : "var(--text-tertiary)",
      }}
    >
      {isActive ? "Active" : "Paused"}
    </span>
  );
}

function StrategyLibraryMetric({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "profit" | "loss";
  mono?: boolean;
}) {
  const color =
    tone === "profit"
      ? "var(--profit-primary)"
      : tone === "loss"
        ? "var(--loss-primary)"
        : "var(--text-primary)";

  return (
    <div
      className="rounded-[12px] border px-3 py-2"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <p
        className={cn("mt-1 text-sm font-semibold", mono && "mono")}
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

export function StrategyStatusControl({
  isActive,
  onChange,
}: {
  isActive: boolean;
  onChange: (nextValue: boolean) => void;
}) {
  const options = [
    { label: "Active", value: true },
    { label: "Paused", value: false },
  ] as const;

  return (
    <div className="space-y-2">
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Status
      </p>

      <div
        className="inline-flex rounded-[12px] border p-1"
        role="group"
        aria-label="Strategy status"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {options.map((option) => {
          const selected = isActive === option.value;

          return (
            <button
              key={option.label}
              type="button"
              className="inline-flex items-center rounded-[9px] px-3 py-1.5 text-[0.74rem] font-semibold transition-all"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              style={{
                background: selected
                  ? option.value
                    ? "var(--surface)"
                    : "var(--surface-elevated)"
                  : "transparent",
                color: selected
                  ? option.value
                    ? "var(--accent-primary)"
                    : "var(--text-secondary)"
                  : "var(--text-tertiary)",
                border: selected ? "1px solid var(--border-subtle)" : "1px solid transparent",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StrategyLibraryItem({
  strategy,
  onOpen,
  selected = false,
}: {
  strategy: StrategyCardData;
  onOpen: () => void;
  selected?: boolean;
}) {
  const totalPnlTone =
    strategy.stats.totalPnl > 0
      ? "profit"
      : strategy.stats.totalPnl < 0
        ? "loss"
        : "default";
  const winRateTone =
    strategy.stats.winRate >= 55
      ? "profit"
      : strategy.stats.winRate < 45
        ? "loss"
        : "default";

  return (
    <InsetPanel
      paddingClassName="p-0"
      style={
        selected
          ? {
              background: "color-mix(in srgb, var(--accent-soft) 34%, var(--surface-elevated))",
              borderColor: "var(--accent-muted)",
            }
          : undefined
      }
    >
      <div>
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
              style={{
                background: "var(--surface)",
                color: "var(--accent-primary)",
                border: `1px solid ${
                  selected ? "var(--accent-muted)" : "var(--border-subtle)"
                }`,
              }}
            >
              <IconStrategies size={16} strokeWidth={1.8} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StrategyStatusBadge isActive={strategy.isActive} />
                <span
                  className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold"
                  style={{
                    background: "var(--surface)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {strategy.rules.length} point{strategy.rules.length === 1 ? "" : "s"}
                </span>
              </div>

              <p className="truncate text-sm font-semibold leading-5">{strategy.name}</p>
              <p
                className="mt-1 text-xs leading-5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {strategy.description?.trim() || "No brief written yet."}
              </p>
            </div>
          </div>

          <StrategyActionButton
            tone={selected ? "primary" : "secondary"}
            onClick={onOpen}
            className="shrink-0"
          >
            {selected ? "Editing" : "Open"}
          </StrategyActionButton>
        </div>

        <div
          className="grid gap-2 border-t p-3 sm:grid-cols-2 xl:grid-cols-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <StrategyLibraryMetric
            label="Rules"
            value={`${strategy.rules.length}`}
          />
          <StrategyLibraryMetric
            label="Trades"
            value={`${strategy.stats.totalTrades}`}
          />
          <StrategyLibraryMetric
            label="Win Rate"
            value={toPercent(strategy.stats.winRate)}
            tone={winRateTone}
          />
          <StrategyLibraryMetric
            label="Net P&L"
            value={formatSignedCurrency(strategy.stats.totalPnl)}
            tone={totalPnlTone}
            mono
          />
        </div>
      </div>
    </InsetPanel>
  );
}

export function StrategyRulePointRow({
  index,
  value,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  value: string;
  onChange: (nextValue: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-center">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-sm font-semibold"
        style={{
          background: "var(--surface)",
          color: "var(--text-tertiary)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {index + 1}
      </div>

      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Write one rule point"
      />

      <StrategyActionButton
        type="button"
        tone="quiet"
        onClick={onRemove}
        disabled={!canRemove}
      >
        Remove
      </StrategyActionButton>
    </div>
  );
}
