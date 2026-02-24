"use client";

import { useMemo } from "react";
import { getPnLColorClass } from "@/lib/utils/trade-colors";
import { EnrichedTrade } from "@/domain/trade-types";
import { Playbook, TradeScreenshot } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPlus } from "@/components/ui/icons";

interface JournalSidebarProps {
  trade: EnrichedTrade;
  playbooks: Playbook[];
  onUpdate: (field: keyof EnrichedTrade, value: unknown) => void;
  isSaving?: boolean;
}

// ─── Section label ───────────────────────────────────────────────────────────
function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span className="text-label block" style={{ fontSize: "0.6rem" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: "1px", background: "var(--border-subtle)" }} />;
}

export function JournalSidebar({
  trade,
  playbooks,
  onUpdate,
  isSaving,
}: JournalSidebarProps) {
  // PnL pill
  const pnl = trade.pnl ?? 0;
  const isProfit = pnl > 0;
  const isLoss = pnl < 0;

  const pnlStyle = useMemo(() => {
    if (!pnl || pnl === 0)
      return {
        background: "var(--surface-elevated)",
        borderColor: "var(--border-default)",
      };
    return {
      background: isProfit ? "var(--profit-bg)" : "var(--loss-bg)",
      borderColor: isProfit ? "var(--profit-primary)" : "var(--loss-primary)",
    };
  }, [pnl, isProfit]);

  const pnlTextColor = isProfit
    ? "var(--profit-primary)"
    : isLoss
      ? "var(--loss-primary)"
      : "var(--text-tertiary)";

  // Screenshots
  const screenshots = useMemo(() => {
    if (!trade.screenshots) return [];
    if (Array.isArray(trade.screenshots)) {
      return trade.screenshots as unknown as TradeScreenshot[];
    }
    return [];
  }, [trade.screenshots]);

  return (
    <div
      className="w-[320px] flex flex-col h-full"
      style={{
        borderLeft: "1px solid var(--border-default)",
        background: "var(--surface)",
      }}
    >
      {/* ── Header: Symbol + PnL pill ── */}
      <div
        className="p-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-label" style={{ fontSize: "0.6rem" }}>
            Asset
          </span>
          <span
            style={{
                            fontWeight: 700,
              fontSize: "1.35rem",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {trade.symbol}
          </span>
        </div>

        <div
          className="flex flex-col items-end px-3 py-2 rounded-[var(--radius-default)] border"
          style={pnlStyle}
        >
          <span
            className="text-label"
            style={{ fontSize: "0.55rem", marginBottom: "2px" }}
          >
            Net PnL
          </span>
          <span
            className={cn(
              "mono font-bold leading-none",
              getPnLColorClass(trade.pnl),
            )}
            style={{ fontSize: "1.05rem", color: pnlTextColor }}
          >
            {typeof trade.pnl === "number"
              ? formatCurrency(trade.pnl)
              : "$0.00"}
          </span>
        </div>
      </div>

      {/* ── Stats row: R-Multiple + Quality ── */}
      <div
        className="grid grid-cols-2 gap-px shrink-0"
        style={{
          background: "var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="flex flex-col gap-0.5 p-3"
          style={{ background: "var(--surface)" }}
        >
          <span className="text-label" style={{ fontSize: "0.55rem" }}>
            R-Multiple
          </span>
          <span
            className="mono font-bold"
            style={{
              fontSize: "0.9rem",
              color:
                (trade.r_multiple ?? 0) >= 0
                  ? "var(--profit-primary)"
                  : "var(--loss-primary)",
            }}
          >
            {trade.r_multiple != null
              ? `${trade.r_multiple >= 0 ? "+" : ""}${trade.r_multiple.toFixed(2)}R`
              : "—"}
          </span>
        </div>
        <div
          className="flex flex-col gap-0.5 p-3 items-end"
          style={{ background: "var(--surface)" }}
        >
          <span className="text-label" style={{ fontSize: "0.55rem" }}>
            Grade
          </span>
          <span
            className="font-bold"
            style={{
              fontSize: "0.9rem",
              color: trade.execution_grade
                ? "var(--accent-primary)"
                : "var(--text-tertiary)",
            }}
          >
            {trade.execution_grade ?? "—"}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Strategy selection */}
          <SidebarSection label="Strategy / Playbook">
            <Select
              value={trade.playbook_id ?? undefined}
              onValueChange={(val) => onUpdate("playbook_id", val)}
            >
              <SelectTrigger
                className="h-8 text-xs"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                }}
              >
                <SelectValue placeholder="Select strategy..." />
              </SelectTrigger>
              <SelectContent>
                {playbooks?.map((pb) => (
                  <SelectItem key={pb.id} value={pb.id} className="text-xs">
                    {pb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SidebarSection>

          <Divider />

          {/* Trade notes */}
          <SidebarSection label="Trade Notes">
            <div className="relative">
              <textarea
                placeholder="Capture your thoughts, reasoning, and observations..."
                className="w-full rounded-[var(--radius-default)] p-2.5 text-xs resize-none focus:outline-none leading-relaxed border transition-colors"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                  minHeight: "140px",
                  fontFamily: "var(--font-jb-mono)",
                }}
                value={trade.notes ?? ""}
                onChange={(e) => onUpdate("notes", e.target.value)}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--accent-primary)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border-default)")
                }
              />
              {isSaving && (
                <span
                  className="absolute bottom-2 right-2 text-[0.6rem] animate-pulse"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Saving...
                </span>
              )}
            </div>
          </SidebarSection>

          <Divider />

          {/* Screenshots */}
          <SidebarSection label={`Evidence · ${screenshots.length} files`}>
            {screenshots.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-2 py-5 rounded-[var(--radius-default)] border border-dashed"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--surface-elevated)",
                }}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent-primary)",
                  }}
                >
                  <IconPlus size={12} strokeWidth={2} />
                </div>
                <span
                  style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}
                >
                  No screenshots yet
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {screenshots.map((s, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-2.5 p-2 rounded-[var(--radius-default)] border transition-colors"
                    style={{
                      background: "var(--surface-elevated)",
                      borderColor: "var(--border-default)",
                    }}
                  >
                    <div
                      className="h-8 w-12 rounded overflow-hidden shrink-0 border"
                      style={{
                        borderColor: "var(--border-default)",
                        background: "var(--surface-hover)",
                      }}
                    />
                    <div className="flex-1 flex flex-col gap-0.5">
                      <span
                        className="mono text-[0.68rem] font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {s.timeframe ?? "Screenshot"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.62rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {s.created_at
                          ? new Date(s.created_at).toLocaleTimeString(
                              undefined,
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "Unknown time"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SidebarSection>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Local helper ─────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
