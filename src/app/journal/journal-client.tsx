"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  RefreshCw,
  Plus,
  X,
  FileText,
  Activity,
  BookOpen,
  BarChart2,
  Save,
  CheckCircle,
  Brain,
  ChevronLeft,
  Zap,
  Layers,
  PenLine,
  Library,
} from "lucide-react";
import Link from "next/link";
import { getTrades } from "@/lib/api/client/trades";
import { getTerminalStatusByPropAccount } from "@/lib/api/terminal-farm";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import type { Trade as DrizzleTrade } from "@/lib/db/schema";
import type { Trade as SupabaseTrade } from "@/lib/supabase/types";
import type { EnrichedTrade } from "@/domain/trade-types";

/** Bridge: convert Drizzle Trade (camelCase, string pnl, Date objects) into the
 *  old Supabase-compatible shape that all the mappers + widgets expect. */
function normalizeTrade(t: DrizzleTrade): SupabaseTrade {
  return {
    ...t,
    // numeric fields stored as Drizzle decimal strings
    pnl: t.pnl != null ? Number(t.pnl) : null,
    commission: t.commission != null ? Number(t.commission) : null,
    // date fields: Drizzle returns Date objects, old code expects ISO strings
    entry_date:
      t.entryDate instanceof Date
        ? t.entryDate.toISOString()
        : ((t.entryDate as unknown as string) ?? ""),
    exit_date:
      t.exitDate instanceof Date
        ? t.exitDate.toISOString()
        : ((t.exitDate as unknown as string) ?? null),
    // Normalise DB uppercase status ('OPEN'/'CLOSED') to lowercase so all
    // downstream display logic (stats, isOpen, getOutcome) works uniformly.
    status: t.status?.toLowerCase() ?? t.status,
    // snake_case aliases
    r_multiple:
      (t as unknown as { rMultiple?: number | null }).rMultiple ?? null,
    position_size:
      (t as unknown as { positionSize?: number | null }).positionSize ?? null,
    prop_account_id: t.propAccountId,
    playbook_id: t.playbookId,
    magic_number:
      (t as unknown as { magicNumber?: number | null }).magicNumber ?? null,
    // Spread remaining fields as-is (id, symbol, direction, etc.)
  } as unknown as SupabaseTrade;
}

/** Convenience: use Drizzle Trade as the canonical type, cast via bridge */
type Trade = SupabaseTrade;

// -- Domain types & mapper (Phase 1: single source of truth) --
import type { JournalEntryDraft, JournalTab } from "@/domain/journal-types";
import {
  mapTradeToViewModel,
  viewModelToDraft,
  isRawTradeJournaled,
  toSupabaseScreenshot,
} from "@/domain/journal-mapper";
import { useJournalAutosave } from "@/hooks/use-journal-autosave";

// -- Shared format helpers (deduplicated) --
import {
  fmtCurrency,
  fmtR,
  fmtDate,
  getOutcome,
  PROFIT,
  LOSS_COLOR as LOSS,
  ACCENT,
} from "@/components/journal/utils/format";

// -- Journal library view --
import {
  JournalLibrary,
  type JournalTrade,
} from "@/components/journal/journal-library";

// €€ Existing journal widgets €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
import { BiasWidget } from "@/components/journal/bias-widget";
import { MaeMfeCard } from "@/components/journal/mae-mfe-card";
import { PsychologyWidget } from "@/components/journal/psychology-widget";
import { ExecutionWidget } from "@/components/journal/execution-widget";
import { TagSelector } from "@/components/journal/tag-selector";
import { QualityRating } from "@/components/journal/quality-rating";
import { ConvictionStars } from "@/components/journal/conviction-stars";
import { ScreenshotGallery } from "@/components/journal/screenshot-gallery";

// Colour constants & format helpers now imported from @/components/journal/utils/format

/** Convert a Trade to JournalTrade shape for the JournalLibrary component.
 *  Uses the canonical mapper internally. */
function toJournalTrade(t: Trade): JournalTrade {
  const vm = mapTradeToViewModel(t);
  return {
    ...t,
    direction: vm.direction,
    status: vm.status,
    execution_arrays: vm.executionArrays,
    screenshots: vm.screenshots.map((s) => ({
      url: s.url,
      timeframe: s.timeframe,
    })),
    tf_observations: vm.tfObservations as Record<
      string,
      { bias?: string; notes?: string }
    >,
  };
}

/** Cast a Trade to EnrichedTrade for components that require it */
function toEnriched(t: Trade): EnrichedTrade {
  const pnl = t.pnl ?? 0;
  return {
    ...t,
    outcome: getOutcome(t.status, t.pnl),
    isOpen: t.status === "open",
    formattedEntryDate: fmtDate(t.entry_date),
    formattedExitDate: t.exit_date ? fmtDate(t.exit_date) : undefined,
    formattedPnL: fmtCurrency(pnl),
  } as EnrichedTrade;
}

// -- Extracted UI components (Phase 3) --
import {
  SecLabel,
  OutcomeBadge,
  DirectionBadge,
  StatPill,
} from "@/components/journal/journal-ui-atoms";
import { TradeRow } from "@/components/journal/trade-row";
import { FullscreenImage } from "@/components/journal/fullscreen-image";
import { useScreenshotUpload } from "@/hooks/use-screenshot-upload";

// ── Journal tab configuration ───────────────────────────────────────────────
const TABS: { id: JournalTab; label: string; Icon: React.ElementType }[] = [
  { id: "notes", label: "Notes", Icon: FileText },
  { id: "bias", label: "Bias", Icon: BarChart2 },
  { id: "setup", label: "Setup", Icon: Layers },
  { id: "execution", label: "Execution", Icon: Zap },
  { id: "psychology", label: "Psychology", Icon: Brain },
];

// €€€ The journaling workspace for a selected trade €€€€€€€€€€€€€€€€€€€€€€€€€€€€
function TradeJournal({
  trade,
  userId,
  onSaved,
  onBackToView,
}: {
  trade: Trade;
  userId: string | undefined;
  onSaved: () => void;
  onBackToView?: () => void;
}) {
  const [state, setState] = useState<JournalEntryDraft>(() =>
    viewModelToDraft(mapTradeToViewModel(trade)),
  );
  const [initialDraft] = useState<JournalEntryDraft>(() =>
    viewModelToDraft(mapTradeToViewModel(trade)),
  );
  const [activeTab, setActiveTab] = useState<JournalTab>("notes");
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  // Autosave hook (replaces inline handleSave + useEffect)
  const {
    saving,
    savedAt,
    save: handleSave,
  } = useJournalAutosave({
    draft: state,
    initialDraft,
    tradeId: trade.id,
    onSaved,
  });

  const update = (patch: Partial<JournalEntryDraft>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  // Enrich for BiasWidget "” cast tf_observations through unknown to satisfy Json
  const enriched: EnrichedTrade = useMemo(
    () => ({
      ...toEnriched(trade),
      tf_observations:
        state.tfObservations as unknown as import("@/lib/supabase/types").Json,
    }),
    [trade, state.tfObservations],
  );

  const handleTradeUpdate = useCallback(
    (field: keyof EnrichedTrade, value: unknown) => {
      if (field === "tf_observations") {
        update({
          tfObservations: value as Record<
            string,
            import("@/domain/journal-types").TfObservation
          >,
        });
      }
    },
    [],
  );

  // Screenshot uploader
  const {
    trigger: triggerUpload,
    uploading,
    inputEl,
  } = useScreenshotUpload(trade.id, userId, (ss) =>
    update({ screenshots: [...state.screenshots, ss] }),
  );

  // Screenshot delete
  const handleDeleteScreenshot = useCallback(
    (url: string) => {
      update({
        screenshots: state.screenshots.filter((s) => {
          const u = typeof s === "string" ? s : s.url;
          return u !== url;
        }),
      });
    },
    [state.screenshots],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {inputEl}

      {/* €€ Trade header bar €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface)",
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="font-black tracking-tight"
            style={{ fontSize: "1.15rem", color: "var(--text-primary)" }}
          >
            {trade.symbol}
          </span>
          <DirectionBadge d={trade.direction as "LONG" | "SHORT"} />
          <OutcomeBadge outcome={getOutcome(trade.status, trade.pnl)} />
          <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
            {fmtDate(trade.entry_date)}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className="font-black tabular-nums"
            style={{
              fontSize: "1.15rem",
              color:
                (trade.pnl ?? 0) > 0
                  ? PROFIT
                  : (trade.pnl ?? 0) < 0
                    ? LOSS
                    : "var(--text-tertiary)",
            }}
          >
            {fmtCurrency(trade.pnl)}
          </span>
          {trade.r_multiple != null && (
            <span
              className="font-mono font-bold"
              style={{
                fontSize: "0.8rem",
                color: (trade.r_multiple ?? 0) >= 0 ? PROFIT : LOSS,
              }}
            >
              {fmtR(trade.r_multiple ?? 0)}
            </span>
          )}
          {/* Save status */}
          {saving ? (
            <span
              style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}
            >
              Saving...
            </span>
          ) : savedAt ? (
            <span
              className="flex items-center gap-1"
              style={{ fontSize: "0.68rem", color: PROFIT }}
            >
              <CheckCircle size={10} />
              Saved
            </span>
          ) : null}
          {/* Back to view is only shown when trade already has journal data */}
          {onBackToView && (
            <button
              onClick={onBackToView}
              className="flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 font-semibold transition-all shrink-0 jnl-hover-border"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
                fontSize: "0.72rem",
              }}
            >
              <ChevronLeft size={11} strokeWidth={2.2} />
              View
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 font-semibold transition-all shrink-0 jnl-hover-accent-bg"
            style={{
              background: ACCENT,
              color: "var(--text-inverse)",
              fontSize: "0.72rem",
            }}
          >
            <Save size={11} strokeWidth={2.2} />
            Save
          </button>
        </div>
      </div>

      {/* €€ Tab bar €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */}
      <div
        className="flex shrink-0 px-5 gap-1"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface)",
        }}
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-3 py-2.5 font-semibold transition-all"
            style={{
              fontSize: "0.73rem",
              color: activeTab === id ? ACCENT : "var(--text-tertiary)",
              borderBottom:
                activeTab === id
                  ? `2px solid ${ACCENT}`
                  : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            <Icon size={12} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {/* €€ Tab content €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="h-full"
          >
            {/* €€ NOTES €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */}
            {activeTab === "notes" && (
              <div className="p-5 space-y-5">
                {/* Main notes textarea */}
                <div className="space-y-2">
                  <SecLabel label="Trade Journal Entry" />
                  <textarea
                    value={state.notes}
                    onChange={(e) => update({ notes: e.target.value })}
                    placeholder={`Write about this trade"¦\n\n"¢ What was the setup and did it match your playbook?\n"¢ How did you manage the position "” any deviations?\n"¢ What was your psychology like during the trade?\n"¢ Key lessons and what you'd do differently.`}
                    className="w-full resize-none rounded-[10px] p-4 font-mono leading-loose outline-none transition-all"
                    style={{
                      minHeight: "240px",
                      fontSize: "0.82rem",
                      color: "var(--text-primary)",
                      background: "var(--surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      lineHeight: 1.8,
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--border-active)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border-subtle)")
                    }
                  />
                </div>

                {/* MAE / MFE card */}
                <div className="space-y-2">
                  <SecLabel label="Price Extremes (MAE / MFE)" />
                  <div
                    className="rounded-[10px] overflow-hidden"
                    style={{ border: "1px solid var(--border-subtle)" }}
                  >
                    <MaeMfeCard
                      mae={state.mae}
                      mfe={state.mfe}
                      rMultiple={trade.r_multiple ?? null}
                      onMaeChange={(v) => update({ mae: v })}
                      onMfeChange={(v) => update({ mfe: v })}
                    />
                  </div>
                </div>

                {/* Conviction + quality ratings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <SecLabel label="Conviction" />
                    <ConvictionStars
                      value={state.conviction}
                      onChange={(v) => update({ conviction: v })}
                    />
                  </div>
                  <div className="space-y-2">
                    <QualityRating
                      label="Entry Quality"
                      value={state.entryRating}
                      onChange={(v) => update({ entryRating: v })}
                    />
                  </div>
                  <div className="space-y-2">
                    <QualityRating
                      label="Exit Quality"
                      value={state.exitRating}
                      onChange={(v) => update({ exitRating: v })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* €€ BIAS €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */}
            {activeTab === "bias" && (
              <div className="p-5">
                <div className="mb-4">
                  <SecLabel label="Multi-Timeframe Bias Analysis" />
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-tertiary)",
                      marginTop: 4,
                    }}
                  >
                    Set your bias (Bullish / Bearish / Neutral) and notes for
                    each timeframe.
                  </p>
                </div>
                <BiasWidget trade={enriched} onUpdate={handleTradeUpdate} />
              </div>
            )}

            {/* €€ SETUP €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */}
            {activeTab === "setup" && (
              <div className="p-5 space-y-6">
                {/* Screenshots */}
                <div className="space-y-2">
                  <SecLabel label="Screenshots" />
                  <ScreenshotGallery
                    screenshots={state.screenshots.map(toSupabaseScreenshot)}
                    onUpload={(tf) => triggerUpload(tf)}
                    onViewFullscreen={(url) => setFullscreenUrl(url)}
                    onDelete={(idx) => {
                      const ss = state.screenshots[idx];
                      handleDeleteScreenshot(
                        typeof ss === "string" ? ss : ss.url,
                      );
                    }}
                  />
                  {uploading && (
                    <p style={{ fontSize: "0.68rem", color: ACCENT }}>
                      Uploading screenshot...
                    </p>
                  )}
                </div>

                {/* Setup tags */}
                <div className="space-y-2">
                  <SecLabel label="Setup Tags (ICT Concepts)" />
                  <TagSelector
                    type="setup"
                    value={state.setupTags}
                    onChange={(v) => update({ setupTags: v })}
                  />
                </div>

                {/* Mistake tags */}
                <div className="space-y-2">
                  <SecLabel label="Mistake Tags" />
                  <TagSelector
                    type="mistake"
                    value={state.mistakeTags}
                    onChange={(v) => update({ mistakeTags: v })}
                  />
                </div>
              </div>
            )}

            {/* €€ EXECUTION €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */}
            {activeTab === "execution" && (
              <div className="p-5">
                <div className="mb-4">
                  <SecLabel label="Execution Analysis" />
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-tertiary)",
                      marginTop: 4,
                    }}
                  >
                    Detail your entry trigger, ICT arrays used, and
                    execution-level screenshots.
                  </p>
                </div>
                <ExecutionWidget
                  executionNotes={state.executionNotes}
                  executionArrays={state.executionArrays}
                  positionSize={trade.position_size ?? null}
                  rMultiple={trade.r_multiple ?? null}
                  commission={null}
                  swap={null}
                  screenshots={state.screenshots
                    .map(toSupabaseScreenshot)
                    .filter(
                      (s) =>
                        typeof s === "object" &&
                        (s.timeframe === "1m" || s.timeframe === "5m"),
                    )}
                  onExecutionNotesChange={(v) => update({ executionNotes: v })}
                  onExecutionArraysChange={(v) =>
                    update({ executionArrays: v })
                  }
                  onScreenshotUpload={(tf) => triggerUpload(tf)}
                  onViewFullscreen={(url) => setFullscreenUrl(url)}
                />
              </div>
            )}

            {/* €€ PSYCHOLOGY €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ */}
            {activeTab === "psychology" && (
              <div className="p-5">
                <div className="mb-4">
                  <SecLabel label="Trading Psychology" />
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-tertiary)",
                      marginTop: 4,
                    }}
                  >
                    Reflect on your emotional state and market observations
                    during this trade.
                  </p>
                </div>
                <PsychologyWidget
                  feelings={state.feelings}
                  observations={state.observations}
                  onFeelingsChange={(v) => update({ feelings: v })}
                  onObservationsChange={(v) => update({ observations: v })}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {fullscreenUrl && (
          <FullscreenImage
            url={fullscreenUrl}
            onClose={() => setFullscreenUrl(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Journal Page ────────────────────────────────────────────────────────
export default function JournalPage() {
  const { user } = useAuth();
  const { selectedAccountId } = usePropAccount();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [livePositions, setLivePositions] = useState<
    Awaited<ReturnType<typeof getTerminalStatusByPropAccount>>["livePositions"]
  >([]);
  const [terminalDiagnostics, setTerminalDiagnostics] = useState<
    Awaited<ReturnType<typeof getTerminalStatusByPropAccount>>["diagnostics"]
  >(null);

  // Page mode: "log" = write new entries | "library" = read saved entries
  const [pageMode, setPageMode] = useState<"log" | "library">("library");

  // Track when a library entry is open (to morph the top bar)
  const [entryTrade, setEntryTrade] = useState<{
    symbol: string;
    pnl?: number | null;
    outcome: string;
  } | null>(null);

  // Log-mode filters (only relevant in log mode)
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [direction, setDirection] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getTrades({
        propAccountId: selectedAccountId ?? undefined,
      });
      setTrades(raw.map(normalizeTrade));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedAccountId || selectedAccountId === "unassigned") {
      setLivePositions([]);
      setTerminalDiagnostics(null);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const status = await getTerminalStatusByPropAccount(selectedAccountId);
        if (cancelled) return;
        setLivePositions(status.livePositions);
        setTerminalDiagnostics(status.diagnostics);
      } catch (error) {
        if (!cancelled) {
          console.error("[Journal] Failed to load MT5 live positions:", error);
          setLivePositions([]);
          setTerminalDiagnostics(null);
        }
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedAccountId]);

  // In log mode we only show UN-journaled trades
  const pendingTrades = useMemo(() => {
    return trades.filter((t) => {
      if (isRawTradeJournaled(t)) return false;
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (outcome !== "all" && getOutcome(t.status, t.pnl) !== outcome)
        return false;
      if (direction !== "all" && t.direction !== direction) return false;
      return true;
    });
  }, [trades, search, outcome, direction]);

  const libraryTrades = useMemo(
    () => trades.map((t) => toJournalTrade(t)),
    [trades],
  );

  const stats = useMemo(() => {
    const closed = pendingTrades.filter((t) => t.status === "closed");
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
    const total = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    return {
      total,
      winRate: closed.length
        ? Math.round((wins.length / closed.length) * 100)
        : 0,
      tradeCount: closed.length,
      openCount: pendingTrades.filter((t) => t.status === "open").length,
    };
  }, [pendingTrades]);

  return (
    <div
      className="journal-theme flex flex-col h-[calc(100vh-52px)] overflow-hidden"
      style={{ background: "var(--app-bg)" }}
    >
      {/* Content floating card — same pattern as AppPanel on other pages */}
      <div
        className="flex-1 min-h-0 overflow-hidden p-4"
        style={{ background: "var(--app-bg)" }}
      >
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-active)",
            boxShadow: "var(--shadow-md), 0 0 20px var(--accent-glow)",
          }}
        >
          {/* ── Card header: tabs + actions ── */}
          <div
            className="flex items-center justify-between px-5 shrink-0"
            style={{
              borderBottom: "1px solid var(--border-subtle)",
              minHeight: 44,
            }}
          >
            {entryTrade ? (
              /* Breadcrumb mode */
              <>
                <button
                  onClick={() => setEntryTrade(null)}
                  className="flex items-center gap-1.5 transition-colors jnl-hover-text-accent"
                  style={{
                    color: "var(--text-tertiary)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                  Journal Library
                </button>
                <div
                  className="flex items-center gap-1.5"
                  style={{ fontSize: "0.65rem" }}
                >
                  <span style={{ color: "var(--text-tertiary)" }}>
                    Journal Library
                  </span>
                  <span style={{ color: "var(--border-active)" }}>/</span>
                  <span
                    style={{ color: "var(--text-primary)", fontWeight: 700 }}
                  >
                    {entryTrade.symbol}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 font-bold ml-1"
                    style={{
                      fontSize: "0.55rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      background:
                        entryTrade.outcome === "WIN"
                          ? "var(--profit-bg)"
                          : entryTrade.outcome === "LOSS"
                            ? "var(--loss-bg)"
                            : "var(--surface-elevated)",
                      color:
                        entryTrade.outcome === "WIN"
                          ? PROFIT
                          : entryTrade.outcome === "LOSS"
                            ? LOSS
                            : "var(--text-secondary)",
                    }}
                  >
                    {entryTrade.outcome}
                  </span>
                  {entryTrade.pnl != null && (
                    <span
                      style={{
                        color: entryTrade.pnl >= 0 ? PROFIT : LOSS,
                        fontWeight: 700,
                        fontSize: "0.7rem",
                      }}
                    >
                      {entryTrade.pnl >= 0 ? "+" : ""}
                      {entryTrade.pnl?.toFixed(2)}
                    </span>
                  )}
                </div>
                <div style={{ opacity: 0 }} className="w-24" />
              </>
            ) : (
              /* Normal mode tabs */
              <>
                <div className="flex items-center gap-0 h-full">
                  {[
                    {
                      id: "library" as const,
                      label: "Journal Library",
                      Icon: Library,
                    },
                    { id: "log" as const, label: "Log a Trade", Icon: PenLine },
                  ].map(({ id, label, Icon }) => {
                    const isActive = pageMode === id;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setPageMode(id);
                          setSelectedTrade(null);
                        }}
                        className="flex items-center gap-1.5 px-4 h-full transition-colors"
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: isActive ? 600 : 500,
                          color: isActive
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                          background: "transparent",
                          borderBottom: isActive
                            ? `2px solid ${ACCENT}`
                            : "2px solid transparent",
                        }}
                      >
                        <Icon size={11} />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <Link
                  href="/trades?new=true"
                  className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 font-semibold transition-all"
                  style={{
                    background: ACCENT,
                    color: "#fff",
                    fontSize: "0.72rem",
                  }}
                >
                  <Plus size={11} strokeWidth={2.5} />
                  New Trade
                </Link>
              </>
            )}
          </div>

          {/* ── Card body ── */}
          <div className="flex-1 min-h-0 overflow-hidden flex">
            {pageMode === "library" && (
              <div className="flex h-full flex-1 flex-col overflow-hidden">
                {(livePositions.length > 0 || terminalDiagnostics) && (
                  <div
                    className="shrink-0 border-b px-5 py-3"
                    style={{
                      borderColor: "var(--border-subtle)",
                      background: "var(--surface-elevated)",
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div
                          className="flex items-center gap-2"
                          style={{
                            fontSize: "0.76rem",
                            color: "var(--text-primary)",
                            fontWeight: 600,
                          }}
                        >
                          <Activity size={13} />
                          Live MT5 Positions
                          {selectedAccountId && (
                            <span
                              className="rounded-full px-2 py-0.5"
                              style={{
                                fontSize: "0.58rem",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                background: "var(--accent-primary-ghost, rgba(0,0,0,0.08))",
                                color: "var(--text-secondary)",
                              }}
                            >
                              Not imported yet
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-tertiary)",
                            marginTop: 4,
                          }}
                        >
                          {livePositions.length > 0
                            ? `${livePositions.length} live MT5 position${livePositions.length === 1 ? "" : "s"} for this prop account. These stay out of journal analytics until they close and import as deal history.`
                            : terminalDiagnostics?.message ??
                              "No live MT5 positions are currently open."}
                        </p>
                      </div>
                      {terminalDiagnostics?.code && (
                        <div
                          className="rounded-full px-2.5 py-1 font-mono"
                          style={{
                            fontSize: "0.58rem",
                            color: "var(--text-primary)",
                            background: "var(--surface)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          {terminalDiagnostics.code}
                        </div>
                      )}
                    </div>

                    {livePositions.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {livePositions.map((position) => (
                          <div
                            key={`${position.ticket}-${position.positionId ?? "live"}`}
                            className="min-w-[220px] rounded-[10px] px-3 py-2"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {position.symbol}
                              </span>
                              <span
                                className="rounded-full px-2 py-0.5"
                                style={{
                                  fontSize: "0.55rem",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  background:
                                    position.type === "BUY"
                                      ? "rgba(16, 185, 129, 0.12)"
                                      : "rgba(244, 63, 94, 0.12)",
                                  color:
                                    position.type === "BUY"
                                      ? "var(--profit-primary)"
                                      : "var(--loss-primary)",
                                }}
                              >
                                {position.type}
                              </span>
                            </div>
                            <div
                              className="mt-1"
                              style={{
                                fontSize: "0.65rem",
                                color: "var(--text-tertiary)",
                              }}
                            >
                              {position.volume} lots at {position.openPrice}
                            </div>
                            <div className="mt-2 flex items-end justify-between gap-2">
                              <span
                                style={{
                                  fontSize: "0.62rem",
                                  color: "var(--text-tertiary)",
                                }}
                              >
                                Current {position.currentPrice}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color:
                                    position.profit >= 0 ? PROFIT : "var(--loss-primary)",
                                }}
                              >
                                {position.profit >= 0 ? "+" : ""}$
                                {position.profit.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <JournalLibrary
                  trades={libraryTrades}
                  onEntryViewChange={(trade) => {
                    if (trade) {
                      const outcome =
                        (trade.pnl ?? 0) > 0
                          ? "WIN"
                          : (trade.pnl ?? 0) < 0
                            ? "LOSS"
                            : "B/E";
                      setEntryTrade({
                        symbol: trade.symbol ?? "",
                        pnl: trade.pnl,
                        outcome,
                      });
                    } else {
                      setEntryTrade(null);
                    }
                  }}
                  onEditTrade={(trade) => {
                    setPageMode("log");
                    setSelectedTrade(trade as unknown as Trade);
                    setEntryTrade(null);
                  }}
                />
              </div>
            )}

            {/* LOG MODE */}
            {pageMode === "log" && (
              <>
                {/* LEFT sidebar */}
                <aside
                  className="hidden md:flex flex-col shrink-0 min-h-0"
                  style={{
                    width: "280px",
                    minWidth: "280px",
                    maxWidth: "280px",
                    borderRight: "1px solid var(--border-subtle)",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 shrink-0"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span
                        className="font-bold"
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        Pending Trades
                      </span>
                      <span
                        style={{
                          fontSize: "0.6rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {pendingTrades.length} un-journaled
                      </span>
                    </div>
                    <button
                      onClick={load}
                      className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors jnl-hover-surface"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <RefreshCw size={11} strokeWidth={1.8} />
                    </button>
                  </div>

                  <div
                    className="flex gap-1.5 px-3 py-2 shrink-0"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <StatPill
                      label="P&L"
                      value={fmtCurrency(stats.total)}
                      color={stats.total >= 0 ? PROFIT : LOSS}
                    />
                    <StatPill
                      label="Win %"
                      value={`${stats.winRate}%`}
                      color={stats.winRate >= 50 ? PROFIT : LOSS}
                    />
                    <StatPill label="Trades" value={String(stats.tradeCount)} />
                  </div>

                  <div className="flex items-center gap-2 px-3 pt-2 pb-1.5 shrink-0">
                    <div
                      className="flex items-center gap-1.5 flex-1 min-w-0 rounded-[7px] px-2.5"
                      style={{
                        background: "var(--surface-elevated)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <Search
                        size={10}
                        style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
                      />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search symbol..."
                        className="flex-1 min-w-0 bg-transparent outline-none py-1.5"
                        style={{
                          fontSize: "0.73rem",
                          color: "var(--text-primary)",
                        }}
                      />
                      {search && (
                        <button
                          onClick={() => setSearch("")}
                          style={{
                            color: "var(--text-tertiary)",
                            flexShrink: 0,
                          }}
                        >
                          <X size={9} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-1.5 px-3 pb-2 shrink-0"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <div
                      className="flex rounded-[6px] overflow-hidden shrink-0"
                      style={{ border: "1px solid var(--border-subtle)" }}
                    >
                      {(["all", "WIN", "LOSS", "OPEN"] as const).map(
                        (val, i) => (
                          <button
                            key={val}
                            onClick={() => setOutcome(val)}
                            className="font-semibold transition-colors"
                            style={{
                              fontSize: "0.62rem",
                              padding: "4px 7px",
                              background:
                                outcome === val
                                  ? ACCENT + "22"
                                  : "var(--surface-elevated)",
                              color:
                                outcome === val
                                  ? ACCENT
                                  : "var(--text-tertiary)",
                              borderRight:
                                i < 3
                                  ? "1px solid var(--border-subtle)"
                                  : undefined,
                            }}
                          >
                            {val === "all"
                              ? "All"
                              : val === "WIN"
                                ? "W"
                                : val === "LOSS"
                                  ? "L"
                                  : "O"}
                          </button>
                        ),
                      )}
                    </div>
                    <div
                      className="flex rounded-[6px] overflow-hidden shrink-0"
                      style={{ border: "1px solid var(--border-subtle)" }}
                    >
                      {(["all", "LONG", "SHORT"] as const).map((val, i) => (
                        <button
                          key={val}
                          onClick={() => setDirection(val)}
                          className="font-semibold transition-colors"
                          style={{
                            fontSize: "0.62rem",
                            padding: "4px 7px",
                            background:
                              direction === val
                                ? ACCENT + "22"
                                : "var(--surface-elevated)",
                            color:
                              direction === val
                                ? ACCENT
                                : "var(--text-tertiary)",
                            borderRight:
                              i < 2
                                ? "1px solid var(--border-subtle)"
                                : undefined,
                          }}
                        >
                          {val === "all" ? "All" : val === "LONG" ? "L" : "S"}
                        </button>
                      ))}
                    </div>
                    <span
                      className="ml-auto shrink-0"
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {pendingTrades.length}/{trades.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-2 py-1">
                    {loading ? (
                      <div
                        className="flex items-center justify-center h-32"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <Activity size={20} style={{ opacity: 0.3 }} />
                      </div>
                    ) : pendingTrades.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 gap-3 px-4">
                        <CheckCircle
                          size={24}
                          style={{ color: ACCENT, opacity: 0.5 }}
                        />
                        <p
                          className="text-center"
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-tertiary)",
                            lineHeight: 1.5,
                          }}
                        >
                          All trades journaled!
                          <br />
                          <span
                            style={{ color: ACCENT, cursor: "pointer" }}
                            onClick={() => setPageMode("library")}
                          >
                            View them in Library
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5 py-1">
                        {pendingTrades.map((trade) => (
                          <TradeRow
                            key={trade.id}
                            trade={trade}
                            isSelected={selectedTrade?.id === trade.id}
                            hasNote={false}
                            onClick={() => setSelectedTrade(trade)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className="px-4 py-2 shrink-0 flex justify-between"
                    style={{ borderTop: "1px solid var(--border-subtle)" }}
                  >
                    <span
                      style={{
                        fontSize: "0.62rem",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {pendingTrades.length} pending Â·{" "}
                      {trades.filter(isRawTradeJournaled).length} journaled
                    </span>
                    {stats.openCount > 0 && (
                      <span
                        style={{
                          fontSize: "0.62rem",
                          color: ACCENT,
                          fontWeight: 600,
                        }}
                      >
                        {stats.openCount} open
                      </span>
                    )}
                  </div>
                </aside>

                {/* RIGHT - Editor */}
                <main
                  className="flex-1 overflow-hidden"
                  style={{ background: "var(--surface)" }}
                >
                  <AnimatePresence mode="wait">
                    {selectedTrade ? (
                      <motion.div
                        key={"journal-" + selectedTrade.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="h-full flex flex-col"
                      >
                        <TradeJournal
                          trade={selectedTrade}
                          userId={user?.id}
                          onSaved={() => {
                            load();
                            setPageMode("library");
                            setSelectedTrade(null);
                          }}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-full gap-5"
                      >
                        <div
                          className="flex items-center justify-center rounded-full"
                          style={{
                            width: 72,
                            height: 72,
                            background: "var(--accent-soft)",
                            border: "1px solid var(--border-active)",
                          }}
                        >
                          <BookOpen
                            size={28}
                            style={{ color: ACCENT, opacity: 0.7 }}
                          />
                        </div>
                        <div className="text-center max-w-sm">
                          <p
                            className="font-bold mb-1.5"
                            style={{
                              fontSize: "1rem",
                              color: "var(--text-primary)",
                            }}
                          >
                            Select a trade to journal
                          </p>
                          <p
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--text-tertiary)",
                              lineHeight: 1.6,
                            }}
                          >
                            Pick any pending trade from the left to write notes,
                            track bias, rate execution, and reflect on your
                            psychology.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm">
                          {TABS.map(({ id, label, Icon }) => (
                            <span
                              key={id}
                              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                              style={{
                                background: "var(--surface-elevated)",
                                border: "1px solid var(--border-subtle)",
                                fontSize: "0.72rem",
                                color: "var(--text-secondary)",
                                fontWeight: 500,
                              }}
                            >
                              <Icon size={11} style={{ color: ACCENT }} />
                              {label}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </main>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
