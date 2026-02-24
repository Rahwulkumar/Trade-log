"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  JOURNAL PAGE — Compact, dense, information-rich.
//  Chart (left) + Top-Down Analysis (right) always visible at bottom.
//  Strategy selector + checklist in Details tab.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Trade,
  TradeScreenshot,
  Playbook,
} from "@/lib/supabase/types";
import type { ChartCandle } from "@/lib/terminal-farm/types";
import { useAuth } from "@/components/auth-provider";
import { TradeChart } from "@/components/trade/trade-chart";
import { getActivePlaybooks } from "@/lib/api/playbooks";
import { format, formatDistanceStrict } from "date-fns";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { IconJournal, IconTrades } from "@/components/ui/icons";
import { AppPanel, PanelTitle } from "@/components/ui/page-primitives";
import { DUMMY_TRADES, type DummyTrade } from "@/lib/data/dummy";
import { cn } from "@/lib/utils";
import {
  Label,
  FieldRow,
  StatValue,
  ChipGroup,
  CreatableTagPicker,
  NamedScreenshotGrid,
  CompactTextarea,
  CompactInput,
  QualityRating,
  biasColorFn,
  SESSIONS,
  GRADES,
  FEELINGS,
  CONFLUENCES,
  MARKET_CONDITIONS,
  MISTAKES,
  ICT_BIAS,
  ICT_EXEC,
  getSmartTimeframes,
  detectSession,
} from "./journal-primitives";

type AnyTrade = Trade | DummyTrade;
type Section = "details" | "analysis" | "notes" | "review";

/** Extended Trade type for optional fields not yet in the Supabase schema. */
type ExtendedTrade = Trade & {
  market_condition?: string | null;
  confluences?: string[] | null;
  management_notes?: string | null;
  observations?: string | null;
  mistakes?: string[] | null;
  what_went_well?: string | null;
  what_went_wrong?: string | null;
  risk_notes?: string | null;
  setup_type?: string | null;
  exit_reasoning?: string | null;
  mistake_notes?: string | null;
};

const outcome = (t: AnyTrade) => {
  if (!t.exit_date) return "OPEN";
  return (t.pnl ?? 0) > 0 ? "WIN" : (t.pnl ?? 0) < 0 ? "LOSS" : "BE";
};
const fmtP = (v: number | null | undefined) =>
  v == null
    ? "—"
    : v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });

// ─── Completion ──────────────────────────────────────────────────────────────
function getCompletion(t: AnyTrade): Record<Section, number> {
  const has = (v: unknown) =>
    v != null && v !== "" && (!Array.isArray(v) || v.length > 0);
  const tfObs = (t.tf_observations as Record<string, unknown>) ?? {};
  const hasTf = Object.values(tfObs).some(
    (v) =>
      v &&
      typeof v === "object" &&
      Object.values(v as Record<string, unknown>).some(has),
  );
  return {
    details:
      [
        t.execution_grade,
        t.session,
        t.conviction,
        t.playbook_id,
        (t as ExtendedTrade).market_condition,
      ].filter(has).length / 5,
    analysis:
      [
        (t.execution_arrays as string[])?.length,
        t.execution_notes,
        (t as ExtendedTrade).confluences,
        (t as ExtendedTrade).management_notes,
      ].filter(has).length / 4,
    notes:
      [
        t.notes,
        t.feelings,
        (t as ExtendedTrade).observations,
        (t as ExtendedTrade).mistakes,
      ].filter(has).length / 4,
    review:
      [
        t.entry_rating,
        t.exit_rating,
        t.management_rating,
        t.lesson_learned,
        (t as ExtendedTrade).what_went_well,
        (t as ExtendedTrade).what_went_wrong,
      ].filter(has).length / 6,
  };
}

// ─── Trade Bar ───────────────────────────────────────────────────────────────
function TradeBar({
  trade,
  isDummy,
  onOpenDrawer,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  trade: AnyTrade;
  isDummy: boolean;
  onOpenDrawer: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const p = trade.pnl ?? 0;
  const o = outcome(trade);
  const dur = trade.exit_date
    ? formatDistanceStrict(
        new Date(trade.entry_date),
        new Date(trade.exit_date),
      )
    : null;
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 card-enter rounded-[var(--radius-lg)] border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-default)",
      }}
    >
      <button
        onClick={onOpenDrawer}
        className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--surface-elevated)]"
        style={{ color: "var(--text-secondary)" }}
      >
        <IconTrades size={15} />
      </button>
      <div className="flex items-center gap-0.5">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="w-6 h-6 flex items-center justify-center rounded disabled:opacity-20 hover:bg-[var(--surface-elevated)]"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="w-6 h-6 flex items-center justify-center rounded disabled:opacity-20 hover:bg-[var(--surface-elevated)]"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <span
        className={cn(
          "text-[0.55rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
          trade.direction === "LONG" ? "badge-profit" : "badge-loss",
        )}
      >
        {trade.direction === "LONG" ? "L" : "S"}
      </span>
      <span
        className="text-[0.92rem] font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        {trade.symbol}
      </span>
      <span
        className={cn(
          "badge-base text-[0.5rem] font-bold uppercase tracking-widest px-1.5 py-0.5",
          o === "WIN"
            ? "badge-profit"
            : o === "LOSS"
              ? "badge-loss"
              : "badge-accent",
        )}
      >
        {o}
      </span>
      <div className="flex-1" />
      <span
        className="text-[0.65rem] font-medium hidden sm:block"
        style={{ color: "var(--text-tertiary)" }}
      >
        {format(new Date(trade.entry_date), "MMM d · HH:mm")}
      </span>
      {dur && (
        <span
          className="text-[0.58rem] px-1.5 py-0.5 rounded hidden md:block"
          style={{
            background: "var(--surface-elevated)",
            color: "var(--text-tertiary)",
          }}
        >
          {dur}
        </span>
      )}
      <span
        className="mono text-[0.88rem] font-bold"
        style={{
          color:
            p > 0
              ? "var(--profit-primary)"
              : p < 0
                ? "var(--loss-primary)"
                : "var(--text-primary)",
        }}
      >
        {p !== 0 || trade.exit_date
          ? `${p >= 0 ? "+" : ""}$${Math.abs(p).toFixed(2)}`
          : "—"}
      </span>
      {trade.r_multiple != null && (
        <span
          className="text-[0.55rem] font-bold mono"
          style={{
            color: p >= 0 ? "var(--profit-primary)" : "var(--loss-primary)",
          }}
        >
          {trade.r_multiple >= 0 ? "+" : ""}
          {trade.r_multiple.toFixed(2)}R
        </span>
      )}
      {isDummy && <span className="badge-toggle-on text-[6px]">DEMO</span>}
    </div>
  );
}

// ─── Section Nav ─────────────────────────────────────────────────────────────
const NAV: { id: Section; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "analysis", label: "Analysis" },
  { id: "notes", label: "Notes" },
  { id: "review", label: "Review" },
];

function SectionNav({
  active,
  onSelect,
  completion,
}: {
  active: Section;
  onSelect: (s: Section) => void;
  completion: Record<Section, number>;
}) {
  return (
    <div className="card-enter-1">
      <div className="seg-control w-full">
        {NAV.map((s) => {
          const pct = Math.round(completion[s.id] * 100);
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                "seg-item relative flex-1",
                active === s.id && "active",
              )}
            >
              {s.label}
              {pct > 0 && pct < 100 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                  style={{ background: "var(--warning-primary)" }}
                />
              )}
              {pct >= 100 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                  style={{ background: "var(--profit-primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Trade Drawer — sidebar-theme ────────────────────────────────────────────
function TradeDrawer({
  open,
  onClose,
  trades,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  trades: AnyTrade[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | "WIN" | "LOSS">("ALL");
  const grouped = useMemo(() => {
    const filtered = trades.filter((t) => {
      if (q && !t.symbol.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter !== "ALL" && outcome(t) !== filter) return false;
      return true;
    });
    const map = new Map<string, AnyTrade[]>();
    filtered.forEach((t) => {
      const k = t.entry_date.slice(0, 10);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    });
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [trades, q, filter]);
  const totals = useMemo(() => {
    const wins = trades.filter((t) => (t.pnl ?? 0) > 0).length;
    const pnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    return {
      n: trades.length,
      pnl,
      wr: trades.length ? Math.round((wins / trades.length) * 100) : 0,
    };
  }, [trades]);

  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className="sidebar-theme fixed left-0 top-0 h-screen z-50 flex flex-col"
        style={{
          width: 280,
          borderRight: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
        }}
      >
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h3
              className="text-[0.85rem] font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Trade List
            </h3>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-hover)]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
          <div
            className="flex items-center gap-2 text-[0.62rem]"
            style={{ color: "var(--text-secondary)" }}
          >
            <span>{totals.n} trades</span>
            <span>·</span>
            <span>{totals.wr}% WR</span>
            <span>·</span>
            <span
              className="mono font-semibold"
              style={{ color: totals.pnl >= 0 ? "#2CC299" : "#FF4455" }}
            >
              {totals.pnl >= 0 ? "+" : ""}${Math.abs(totals.pnl).toFixed(0)}
            </span>
          </div>
        </div>
        <div className="px-3 pb-2">
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)]"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-default)",
            }}
          >
            <Search
              className="w-3 h-3 shrink-0"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="flex-1 text-[0.68rem] bg-transparent focus:outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>
        <div className="px-3 pb-2 flex gap-1">
          {(["ALL", "WIN", "LOSS"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 text-[0.58rem] font-semibold py-1 rounded-full transition-all"
              style={
                filter === f
                  ? {
                      background: "var(--surface-active)",
                      color: "var(--text-primary)",
                    }
                  : { color: "var(--text-tertiary)" }
              }
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-1.5">
          {grouped.map(([date, dayTrades]) => {
            const dayPnl = dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
            return (
              <div key={date} className="mb-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <span
                    className="text-[0.52rem] uppercase tracking-widest font-bold"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {format(new Date(date + "T12:00:00"), "EEE, MMM d")}
                  </span>
                  <span
                    className="text-[0.55rem] mono font-bold"
                    style={{ color: dayPnl >= 0 ? "#2CC299" : "#FF4455" }}
                  >
                    {dayPnl >= 0 ? "+" : ""}${Math.abs(dayPnl).toFixed(0)}
                  </span>
                </div>
                {dayTrades.map((t) => {
                  const p = t.pnl ?? 0;
                  const sel = t.id === selectedId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelect(t.id);
                        onClose();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-[var(--radius-sm)] mb-0.5 transition-colors"
                      style={sel ? { background: "var(--surface-active)" } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[0.55rem] font-bold"
                            style={{
                              color:
                                t.direction === "LONG" ? "#2CC299" : "#FF4455",
                            }}
                          >
                            {t.direction === "LONG" ? "▲" : "▼"}
                          </span>
                          <span
                            className="text-[0.76rem] font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {t.symbol}
                          </span>
                        </div>
                        <span
                          className="text-[0.72rem] mono font-semibold"
                          style={{
                            color:
                              p > 0
                                ? "#2CC299"
                                : p < 0
                                  ? "#FF4455"
                                  : "var(--text-tertiary)",
                          }}
                        >
                          {p >= 0 ? "+" : ""}
                          {p.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}

// ═══ Strategy Checklist Panel ═══════════════════════════════════════════════
function StrategyPanel({
  t,
  isDummy,
  playbooks,
  updateField,
}: {
  t: AnyTrade;
  isDummy: boolean;
  playbooks: Playbook[];
  updateField: (f: string, v: unknown) => void;
}) {
  const selectedPb = useMemo(
    () => playbooks.find((p) => p.id === (t.playbook_id as string)),
    [playbooks, t.playbook_id],
  );
  const rules = (selectedPb?.rules as string[] | null) ?? [];
  const checked = ((t as Trade).checked_rules as string[] | null) ?? [];
  const isChecked = (r: string) =>
    checked.includes(r) || checked.some((c) => c.trim() === r.trim());
  const toggleRule = (r: string) => {
    const next = isChecked(r)
      ? checked.filter((c) => c !== r && c.trim() !== r.trim())
      : [...checked, r];
    updateField("checked_rules", next);
  };

  return (
    <AppPanel className="p-4">
      <PanelTitle
        title="Strategy"
        subtitle="Select playbook and verify checklist"
      />
      <div className="space-y-3">
        <div>
          <Label>Playbook</Label>
          <select
            value={(t.playbook_id as string) ?? ""}
            disabled={isDummy}
            onChange={(e) => updateField("playbook_id", e.target.value || null)}
            className="w-full text-[0.72rem] px-2.5 py-2 rounded-[var(--radius-sm)] border bg-transparent focus:outline-none disabled:opacity-30"
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">Select playbook</option>
            {playbooks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {/* Playbook description */}
        {selectedPb?.description && (
          <p
            className="text-[0.68rem] leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
          >
            {selectedPb.description}
          </p>
        )}
        {/* Checklist */}
        {rules.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="mb-0">Checklist</Label>
              <span
                className="text-[0.58rem] mono font-bold"
                style={{ color: "var(--accent-primary)" }}
              >
                {checked.length}/{rules.length}
              </span>
            </div>
            {/* Progress bar */}
            <div
              className="w-full h-1 rounded-full mb-2"
              style={{ background: "var(--surface-elevated)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(checked.length / rules.length) * 100}%`,
                  background: "var(--accent-primary)",
                }}
              />
            </div>
            <div className="space-y-0.5">
              {rules.map((rule, i) => {
                const on = isChecked(rule);
                return (
                  <button
                    key={i}
                    disabled={isDummy}
                    onClick={() => toggleRule(rule)}
                    className="w-full flex items-start gap-2 py-1.5 px-2 rounded-[var(--radius-sm)] text-left transition-colors hover:bg-[var(--surface-elevated)] disabled:opacity-30"
                  >
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all"
                      style={
                        on
                          ? {
                              background: "var(--accent-primary)",
                              borderColor: "var(--accent-primary)",
                            }
                          : { borderColor: "var(--border-active)" }
                      }
                    >
                      {on && (
                        <Check
                          className="w-2.5 h-2.5 text-white"
                          strokeWidth={3}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[0.72rem] leading-snug",
                        on && "line-through",
                      )}
                      style={{
                        color: on
                          ? "var(--text-tertiary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {rule}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppPanel>
  );
}

// ═══ SECTION: Details ════════════════════════════════════════════════════════
function DetailsSection({
  t,
  isDummy,
  playbooks,
  updateField,
}: {
  t: AnyTrade;
  isDummy: boolean;
  playbooks: Playbook[];
  updateField: (f: string, v: unknown) => void;
}) {
  const autoSession = useMemo(
    () => detectSession(t.entry_date),
    [t.entry_date],
  );
  useEffect(() => {
    if (!isDummy && !t.session && autoSession)
      updateField("session", autoSession);
  }, [t.id]); // eslint-disable-line

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 card-enter-2">
      {/* Metrics */}
      <AppPanel className="p-4">
        <PanelTitle title="Metrics" subtitle="Entry, exit, and risk levels" />
        <FieldRow label="Entry">
          <StatValue value={fmtP(t.entry_price)} />
        </FieldRow>
        <FieldRow label="Exit">
          <StatValue value={fmtP(t.exit_price)} />
        </FieldRow>
        <FieldRow label="Stop Loss">
          <StatValue value={fmtP(t.stop_loss)} isGain={false} />
        </FieldRow>
        <FieldRow label="Take Profit">
          <StatValue value={fmtP(t.take_profit)} isGain />
        </FieldRow>
        <FieldRow label="R-Multiple">
          <StatValue
            value={
              t.r_multiple != null
                ? `${t.r_multiple >= 0 ? "+" : ""}${t.r_multiple.toFixed(2)}R`
                : "—"
            }
            isGain={t.r_multiple != null ? t.r_multiple >= 0 : undefined}
          />
        </FieldRow>
        <FieldRow label="Position Size">
          <StatValue
            value={t.position_size != null ? String(t.position_size) : "—"}
          />
        </FieldRow>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {(["mae", "mfe"] as const).map((f) => (
            <div key={f}>
              <Label>{f.toUpperCase()}</Label>
              <CompactInput
                value={t[f] ?? ""}
                type="number"
                disabled={isDummy}
                onChange={(v) => updateField(f, v ? parseFloat(v) : null)}
              />
            </div>
          ))}
        </div>
      </AppPanel>

      {/* Grading */}
      <AppPanel className="p-4">
        <PanelTitle title="Grading" subtitle="Rate this trade's execution" />
        <div className="space-y-3">
          <div>
            <Label>Grade</Label>
            <div className="seg-control w-full">
              {GRADES.map((g) => (
                <button
                  key={g}
                  disabled={isDummy}
                  onClick={() =>
                    updateField(
                      "execution_grade",
                      t.execution_grade === g ? null : g,
                    )
                  }
                  className={cn(
                    "seg-item flex-1 font-bold",
                    t.execution_grade === g && "active",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Conviction</Label>
            <div className="seg-control w-full">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  disabled={isDummy}
                  onClick={() =>
                    updateField("conviction", t.conviction === v ? null : v)
                  }
                  className={cn(
                    "seg-item flex-1",
                    t.conviction === v && "active",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label className="mb-0">Session</Label>
              {t.session === autoSession && (
                <span
                  className="text-[0.5rem] font-semibold px-1 py-0.5 rounded"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent-primary)",
                  }}
                >
                  Auto
                </span>
              )}
            </div>
            <ChipGroup
              options={SESSIONS}
              value={(t.session as string) ?? null}
              onChange={(v) =>
                updateField("session", (t.session as string) === v ? null : v)
              }
              disabled={isDummy}
            />
          </div>
          <div>
            <Label>Market Condition</Label>
            <ChipGroup
              options={MARKET_CONDITIONS}
              value={(t as ExtendedTrade).market_condition ?? null}
              onChange={(v) =>
                updateField(
                  "market_condition",
                  (t as ExtendedTrade).market_condition === v ? null : v,
                )
              }
              disabled={isDummy}
            />
          </div>
        </div>
      </AppPanel>

      {/* Strategy + Checklist */}
      <StrategyPanel
        t={t}
        isDummy={isDummy}
        playbooks={playbooks}
        updateField={updateField}
      />
    </div>
  );
}

// ═══ SECTION: Analysis (Execution only — TDA moved to bottom) ════════════════
function AnalysisSection({
  t,
  isDummy,
  updateField,
  customArrays,
  onCreateArray,
}: {
  t: AnyTrade;
  isDummy: boolean;
  updateField: (f: string, v: unknown) => void;
  customArrays: string[];
  onCreateArray: (tag: string) => void;
}) {
  const execArrays = (t.execution_arrays as string[]) ?? [];
  const allExec = [
    ...ICT_EXEC,
    ...customArrays.filter((c) => !ICT_EXEC.includes(c)),
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 card-enter-2">
      {/* Execution */}
      <AppPanel className="p-4">
        <PanelTitle title="Execution" subtitle="Entry trigger and model" />
        <div className="space-y-3">
          <div>
            <Label>Entry Arrays</Label>
            <CreatableTagPicker
              allTags={allExec}
              selected={execArrays}
              disabled={isDummy}
              onCreateTag={onCreateArray}
              onToggle={(v) =>
                updateField(
                  "execution_arrays",
                  execArrays.includes(v)
                    ? execArrays.filter((x) => x !== v)
                    : [...execArrays, v],
                )
              }
            />
          </div>
          <div>
            <Label>Setup Type</Label>
            <CompactInput
              value={((t as ExtendedTrade).setup_type as string) ?? ""}
              onChange={(v) => updateField("setup_type", v)}
              placeholder="e.g. AMD, 2022 Model..."
              disabled={isDummy}
            />
          </div>
          <div>
            <Label>Why did you enter?</Label>
            <CompactTextarea
              value={(t.execution_notes as string) ?? ""}
              onChange={(v) => updateField("execution_notes", v)}
              placeholder="Describe the trigger..."
              rows={3}
              disabled={isDummy}
            />
          </div>
        </div>
      </AppPanel>

      {/* Confluences */}
      <AppPanel className="p-4">
        <PanelTitle title="Confluences" subtitle="What supported this trade?" />
        <div className="space-y-3">
          <div>
            <Label>Confluences</Label>
            <ChipGroup
              options={CONFLUENCES}
              value={((t as ExtendedTrade).confluences as string[]) ?? []}
              onChange={(v) => {
                const arr = ((t as ExtendedTrade).confluences as string[]) ?? [];
                updateField(
                  "confluences",
                  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v],
                );
              }}
              disabled={isDummy}
            />
          </div>
          <div>
            <Label>Risk Notes</Label>
            <CompactTextarea
              value={((t as ExtendedTrade).risk_notes as string) ?? ""}
              onChange={(v) => updateField("risk_notes", v)}
              placeholder="Risk/reward reasoning, position sizing logic..."
              rows={2}
              disabled={isDummy}
            />
          </div>
        </div>
      </AppPanel>

      {/* Management */}
      <AppPanel className="p-4">
        <PanelTitle
          title="Management"
          subtitle="How did you manage the trade?"
        />
        <div className="space-y-3">
          <div>
            <Label>Management Notes</Label>
            <CompactTextarea
              value={((t as ExtendedTrade).management_notes as string) ?? ""}
              onChange={(v) => updateField("management_notes", v)}
              placeholder="Trail SL, partial TP, adjustments..."
              rows={4}
              disabled={isDummy}
            />
          </div>
          <div>
            <Label>Exit Reasoning</Label>
            <CompactTextarea
              value={((t as ExtendedTrade).exit_reasoning as string) ?? ""}
              onChange={(v) => updateField("exit_reasoning", v)}
              placeholder="Why did you exit when you did?"
              rows={3}
              disabled={isDummy}
            />
          </div>
        </div>
      </AppPanel>
    </div>
  );
}

// ═══ SECTION: Notes ══════════════════════════════════════════════════════════
function NotesSection({
  t,
  isDummy,
  updateField,
}: {
  t: AnyTrade;
  isDummy: boolean;
  updateField: (f: string, v: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 card-enter-2">
      <AppPanel className="p-4">
        <PanelTitle
          title="Trade Notes"
          subtitle="Thesis, context, and reasoning"
        />
        <CompactTextarea
          value={(t.notes as string) ?? ""}
          onChange={(v) => updateField("notes", v)}
          placeholder="What was your reasoning? Market context, narrative..."
          rows={8}
          disabled={isDummy}
        />
      </AppPanel>
      <AppPanel className="p-4">
        <PanelTitle
          title="Psychology"
          subtitle="Emotional state during the trade"
        />
        <Label>Feelings</Label>
        <ChipGroup
          options={FEELINGS}
          value={
            typeof t.feelings === "string"
              ? t.feelings
                ? [t.feelings]
                : []
              : (t.feelings ?? [])
          }
          onChange={(v) => {
            const arr =
              typeof t.feelings === "string"
                ? t.feelings
                  ? [t.feelings]
                  : []
                : ((t.feelings as unknown as string[]) ?? []);
            updateField(
              "feelings",
              arr.includes(v)
                ? arr.filter((x: string) => x !== v)
                : [...arr, v],
            );
          }}
          disabled={isDummy}
        />
        <div className="mt-3">
          <Label>Observations</Label>
          <CompactTextarea
            value={((t as ExtendedTrade).observations as string) ?? ""}
            onChange={(v) => updateField("observations", v)}
            placeholder="Session observations, external factors..."
            rows={3}
            disabled={isDummy}
          />
        </div>
      </AppPanel>
      <AppPanel className="p-4">
        <PanelTitle
          title="Mistakes"
          subtitle="Identify patterns to eliminate"
        />
        <Label>Common Mistakes</Label>
        <ChipGroup
          options={MISTAKES}
          value={((t as ExtendedTrade).mistakes as string[]) ?? []}
          onChange={(v) => {
            const arr = ((t as ExtendedTrade).mistakes as string[]) ?? [];
            updateField(
              "mistakes",
              arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v],
            );
          }}
          disabled={isDummy}
        />
        <div className="mt-3">
          <Label>Notes</Label>
          <CompactTextarea
            value={((t as ExtendedTrade).mistake_notes as string) ?? ""}
            onChange={(v) => updateField("mistake_notes", v)}
            placeholder="What would you do differently?"
            rows={3}
            disabled={isDummy}
          />
        </div>
      </AppPanel>
    </div>
  );
}

// ═══ SECTION: Review ═════════════════════════════════════════════════════════
function ReviewSection({
  t,
  isDummy,
  updateField,
}: {
  t: AnyTrade;
  isDummy: boolean;
  updateField: (f: string, v: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 card-enter-2">
      <AppPanel className="p-4">
        <PanelTitle title="Quality" subtitle="Rate each phase" />
        <QualityRating
          label="Entry"
          value={(t.entry_rating as string) ?? null}
          onChange={(v) => updateField("entry_rating", v)}
          disabled={isDummy}
        />
        <QualityRating
          label="Exit"
          value={(t.exit_rating as string) ?? null}
          onChange={(v) => updateField("exit_rating", v)}
          disabled={isDummy}
        />
        <QualityRating
          label="Management"
          value={(t.management_rating as string) ?? null}
          onChange={(v) => updateField("management_rating", v)}
          disabled={isDummy}
        />
        <div className="mt-3">
          <Label>Would take again?</Label>
          <ChipGroup
            options={["Yes", "No"]}
            value={
              t.would_take_again == null
                ? null
                : t.would_take_again
                  ? "Yes"
                  : "No"
            }
            onChange={(v) => updateField("would_take_again", v === "Yes")}
            disabled={isDummy}
            colorFn={(o, on) =>
              on
                ? o === "Yes"
                  ? {
                      background: "var(--profit-bg)",
                      color: "var(--profit-primary)",
                      borderColor: "var(--profit-primary)",
                    }
                  : {
                      background: "var(--loss-bg)",
                      color: "var(--loss-primary)",
                      borderColor: "var(--loss-primary)",
                    }
                : undefined
            }
          />
        </div>
      </AppPanel>
      <AppPanel className="p-4">
        <PanelTitle title="What Went Well" subtitle="Reinforce good habits" />
        <CompactTextarea
          value={((t as ExtendedTrade).what_went_well as string) ?? ""}
          onChange={(v) => updateField("what_went_well", v)}
          placeholder="What did you do right?"
          rows={6}
          disabled={isDummy}
        />
      </AppPanel>
      <AppPanel className="p-4">
        <PanelTitle title="Lessons" subtitle="Improve for next time" />
        <CompactTextarea
          value={(t.lesson_learned as string) ?? ""}
          onChange={(v) => updateField("lesson_learned", v)}
          placeholder="Every trade teaches something..."
          rows={3}
          disabled={isDummy}
        />
        <div className="mt-3">
          <Label>What Went Wrong</Label>
          <CompactTextarea
            value={((t as ExtendedTrade).what_went_wrong as string) ?? ""}
            onChange={(v) => updateField("what_went_wrong", v)}
            placeholder="What could be improved?"
            rows={3}
            disabled={isDummy}
          />
        </div>
      </AppPanel>
    </div>
  );
}

// ═══ Bottom bar: Chart + Top-Down Analysis side by side ═════════════════════
function BottomBar({
  t,
  isDummy,
  isDummyMode,
  chartCandles,
  chartLoading,
  chartError,
  chartRateLimited,
  loadChart,
  updateField,
  customArrays,
  onCreateArray,
}: {
  t: AnyTrade;
  isDummy: boolean;
  isDummyMode: boolean;
  chartCandles: ChartCandle[];
  chartLoading: boolean;
  chartError: string | null;
  chartRateLimited: boolean;
  loadChart: () => void;
  updateField: (f: string, v: unknown) => void;
  customArrays: string[];
  onCreateArray: (tag: string) => void;
}) {
  const smartTFs = useMemo(
    () => getSmartTimeframes(t.entry_date, t.exit_date),
    [t.entry_date, t.exit_date],
  );
  const [activeTf, setActiveTf] = useState(smartTFs[0]);
  const effectiveActiveTf = smartTFs.includes(activeTf) ? activeTf : smartTFs[0];

  const tfObs =
    (t.tf_observations as Record<
      string,
      { bias?: string; notes?: string; pd_arrays?: string[] }
    >) ?? {};
  const cur = tfObs[effectiveActiveTf] ?? {};
  const screenshots = (t.screenshots as unknown as TradeScreenshot[]) ?? [];
  const allBias = [
    ...ICT_BIAS,
    ...customArrays.filter((c) => !ICT_BIAS.includes(c)),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 card-enter-3">
      {/* Chart */}
      <AppPanel className="p-3">
        <PanelTitle
          title="Chart"
          subtitle="Price action with execution markers"
          className="mb-2"
        />
        {isDummyMode ? (
          <div
            className="h-[240px] flex items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              background: "var(--surface-elevated)",
              color: "var(--text-tertiary)",
            }}
          >
            <p className="text-[0.72rem]">Chart unavailable in demo mode</p>
          </div>
        ) : (
          <div
            className="h-[240px] rounded-[var(--radius-sm)] overflow-hidden border"
            style={{ borderColor: "var(--border-default)" }}
          >
            <TradeChart
              candles={chartCandles}
              entryPrice={(t as Trade).entry_price ?? 0}
              exitPrice={(t as Trade).exit_price}
              stopLoss={(t as Trade).stop_loss ?? 0}
              takeProfit={(t as Trade).take_profit ?? 0}
              entryTime={t.entry_date}
              exitTime={t.exit_date}
              direction={(t.direction ?? "LONG") as "LONG" | "SHORT"}
              isLoading={chartLoading}
              error={chartError ?? undefined}
              rateLimited={chartRateLimited}
              onRefresh={loadChart}
            />
          </div>
        )}
      </AppPanel>

      {/* Top-Down Analysis */}
      <AppPanel className="p-4">
        <PanelTitle
          title="Top-Down Analysis"
          subtitle={`Smart TFs for ${t.exit_date ? formatDistanceStrict(new Date(t.entry_date), new Date(t.exit_date)) : "open"} trade`}
        />
        {/* TF selector */}
        <div className="seg-control mb-3 w-full">
          {smartTFs.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTf(tf)}
              className={cn(
                "seg-item relative flex-1",
                effectiveActiveTf === tf && "active",
              )}
            >
              {tf}
              {tfObs[tf]?.bias && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      tfObs[tf].bias === "Bullish"
                        ? "var(--profit-primary)"
                        : tfObs[tf].bias === "Bearish"
                          ? "var(--loss-primary)"
                          : "var(--warning-primary)",
                  }}
                />
              )}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <Label>Bias</Label>
            <ChipGroup
              options={["Bullish", "Bearish", "Neutral"]}
              value={cur.bias ?? null}
              onChange={(v) =>
                updateField("tf_observations", {
                  ...tfObs,
                  [effectiveActiveTf]: { ...cur, bias: cur.bias === v ? undefined : v },
                })
              }
              disabled={isDummy}
              colorFn={biasColorFn}
            />
          </div>
          <div>
            <Label>PD Arrays</Label>
            <CreatableTagPicker
              allTags={allBias}
              selected={cur.pd_arrays ?? []}
              disabled={isDummy}
              onCreateTag={onCreateArray}
              onToggle={(v) => {
                const arr = cur.pd_arrays ?? [];
                updateField("tf_observations", {
                  ...tfObs,
                  [effectiveActiveTf]: {
                    ...cur,
                    pd_arrays: arr.includes(v)
                      ? arr.filter((x) => x !== v)
                      : [...arr, v],
                  },
                });
              }}
            />
          </div>
          <div>
            <Label>{effectiveActiveTf} Notes</Label>
            <CompactTextarea
              value={cur.notes ?? ""}
              onChange={(v) =>
                updateField("tf_observations", {
                  ...tfObs,
                  [effectiveActiveTf]: { ...cur, notes: v },
                })
              }
              placeholder={`${effectiveActiveTf} observations...`}
              rows={2}
              disabled={isDummy}
            />
          </div>
          <div>
            <Label>Screenshots</Label>
            <NamedScreenshotGrid
              screenshots={screenshots}
              tf={effectiveActiveTf}
              isDummy={isDummy}
              onUpload={() => {}}
              onView={() => {}}
            />
          </div>
        </div>
      </AppPanel>
    </div>
  );
}

// ═══ MAIN ════════════════════════════════════════════════════════════════════

export default function JournalPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("details");
  const [chartCandles, setChartCandles] = useState<ChartCandle[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartRateLimited, setChartRateLimited] = useState(false);
  const [customArrays, setCustomArrays] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data }, pbs] = await Promise.all([
          supabase
            .from("trades")
            .select("*")
            .order("entry_date", { ascending: false }),
          getActivePlaybooks().catch(() => [] as Playbook[]),
        ]);
        setTrades((data ?? []) as Trade[]);
        setPlaybooks(pbs);
        setSelectedId(data?.length ? data[0].id : DUMMY_TRADES[0].id);
      } catch {
        setSelectedId(DUMMY_TRADES[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  const isDummy = trades.length === 0;
  const allTrades: AnyTrade[] = isDummy ? DUMMY_TRADES : trades;
  const selectedIdx = useMemo(
    () => allTrades.findIndex((t) => t.id === selectedId),
    [allTrades, selectedId],
  );
  const selected = selectedIdx >= 0 ? allTrades[selectedIdx] : null;
  const completion = useMemo(
    () =>
      selected
        ? getCompletion(selected)
        : { details: 0, analysis: 0, notes: 0, review: 0 },
    [selected],
  );

  const updateField = useCallback(
    async (field: string, value: unknown) => {
      if (!selectedId || isDummy) return;
      setTrades((prev) =>
        prev.map((t) => (t.id === selectedId ? { ...t, [field]: value } : t)),
      );
      try {
        await supabase
          .from("trades")
          .update({ [field]: value })
          .eq("id", selectedId);
      } catch {
        /* */
      }
    },
    [selectedId, supabase, isDummy],
  );

  const loadChart = useCallback(async () => {
    const t = selected as Trade | undefined;
    if (!t?.exit_date) return;
    setChartLoading(true);
    setChartError(null);
    setChartRateLimited(false);
    try {
      const r = await (
        await fetch("/api/trades/chart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tradeId: t.id,
            symbol: t.symbol,
            entryTime: t.entry_date,
            exitTime: t.exit_date,
          }),
        })
      ).json();
      if (r.rateLimited) setChartRateLimited(true);
      else if (r.error) setChartError(r.error);
      else
        setChartCandles(
          (r.candles ?? []).map((c: Record<string, unknown>) => ({
            time: (c.time as number) ?? Math.floor((c.datetime ? new Date(c.datetime as string).getTime() : Date.now()) / 1000),
            open: c.open as number,
            high: c.high as number,
            low: c.low as number,
            close: c.close as number,
            volume: c.volume as number | undefined,
          })),
        );
    } catch {
      setChartError("Failed");
    } finally {
      setChartLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    if (!selected || isDummy) {
      setChartCandles([]);
      return;
    }
    const t = selected as Trade;
    const cd = t.chart_data as { candles?: Record<string, unknown>[] } | null;
    if (cd?.candles?.length) {
      setChartCandles(
        cd.candles.map((c) => ({
          time: (c.time as number) ?? Math.floor((c.datetime ? new Date(c.datetime as string).getTime() : Date.now()) / 1000),
          open: c.open as number,
          high: c.high as number,
          low: c.low as number,
          close: c.close as number,
          volume: c.volume as number | undefined,
        })),
      );
    } else {
      setChartCandles([]);
      if (t.exit_date) loadChart();
    }
  }, [selected?.id]); // eslint-disable-line

  if (loading)
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Loader2
          className="w-5 h-5 animate-spin"
          style={{ color: "var(--accent-primary)" }}
        />
      </div>
    );

  if (!selected)
    return (
      <div className="page-root page-enter">
        <div
          className="h-[60vh] flex flex-col items-center justify-center gap-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          <IconJournal size={28} />
          <p className="headline-md text-[0.95rem]">No trades to journal</p>
          <p className="text-[0.72rem]">
            Import your first trade to get started
          </p>
        </div>
      </div>
    );

  return (
    <div
      className="page-root page-enter"
      style={{ background: "var(--app-bg)" }}
    >
      <div className="page-sections" style={{ gap: "0.6rem" }}>
        <TradeBar
          trade={selected}
          isDummy={isDummy}
          onOpenDrawer={() => setDrawerOpen(true)}
          onPrev={() =>
            selectedIdx > 0 && setSelectedId(allTrades[selectedIdx - 1].id)
          }
          onNext={() =>
            selectedIdx < allTrades.length - 1 &&
            setSelectedId(allTrades[selectedIdx + 1].id)
          }
          hasPrev={selectedIdx > 0}
          hasNext={selectedIdx < allTrades.length - 1}
        />

        <SectionNav
          active={activeSection}
          onSelect={setActiveSection}
          completion={completion}
        />

        {activeSection === "details" && (
          <DetailsSection
            t={selected}
            isDummy={isDummy}
            playbooks={playbooks}
            updateField={updateField}
          />
        )}
        {activeSection === "analysis" && (
          <AnalysisSection
            t={selected}
            isDummy={isDummy}
            updateField={updateField}
            customArrays={customArrays}
            onCreateArray={(t) => setCustomArrays((p) => [...p, t])}
          />
        )}
        {activeSection === "notes" && (
          <NotesSection
            t={selected}
            isDummy={isDummy}
            updateField={updateField}
          />
        )}
        {activeSection === "review" && (
          <ReviewSection
            t={selected}
            isDummy={isDummy}
            updateField={updateField}
          />
        )}

        {/* ─── Bottom: Chart + Top-Down Analysis side by side ────────── */}
        <BottomBar
          t={selected}
          isDummy={isDummy}
          isDummyMode={isDummy}
          chartCandles={chartCandles}
          chartLoading={chartLoading}
          chartError={chartError}
          chartRateLimited={chartRateLimited}
          loadChart={loadChart}
          updateField={updateField}
          customArrays={customArrays}
          onCreateArray={(t) => setCustomArrays((p) => [...p, t])}
        />
      </div>

      <TradeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        trades={allTrades}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </div>
  );
}
