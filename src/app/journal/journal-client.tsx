"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  ArrowUpRight,
  ArrowDownRight,
  Save,
  CheckCircle,
  Brain,
  Zap,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getTrades } from "@/lib/api/trades";
import { uploadTradeScreenshot } from "@/lib/api/storage";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import type { Trade, TradeScreenshot } from "@/lib/supabase/types";
import type { EnrichedTrade } from "@/domain/trade-types";

// ── Existing journal widgets ──────────────────────────────────────────────────
import { BiasWidget } from "@/components/journal/bias-widget";
import { MaeMfeCard } from "@/components/journal/mae-mfe-card";
import { PsychologyWidget } from "@/components/journal/psychology-widget";
import { ExecutionWidget } from "@/components/journal/execution-widget";
import { TagSelector } from "@/components/journal/tag-selector";
import { QualityRating } from "@/components/journal/quality-rating";
import { ConvictionStars } from "@/components/journal/conviction-stars";
import { ScreenshotGallery } from "@/components/journal/screenshot-gallery";

// ─── Color palette ────────────────────────────────────────────────────────────
const PROFIT = "#0D9B6E"; // matches --profit-primary
const LOSS = "#FF4455"; // matches --loss-primary
const ACCENT = "#2CC299"; // matches --accent-secondary

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "") + "$" + Math.abs(n).toFixed(2);
}
function fmtR(n: number | null | undefined) {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "R";
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getOutcome(trade: Trade): "WIN" | "LOSS" | "BE" | "OPEN" {
  if (trade.status === "open") return "OPEN";
  const pnl = trade.pnl ?? 0;
  if (pnl > 0.5) return "WIN";
  if (pnl < -0.5) return "LOSS";
  return "BE";
}

/** Cast a Trade to EnrichedTrade for components that require it */
function toEnriched(t: Trade): EnrichedTrade {
  const pnl = t.pnl ?? 0;
  return {
    ...t,
    outcome: getOutcome(t),
    isOpen: t.status === "open",
    formattedEntryDate: fmtDate(t.entry_date),
    formattedExitDate: t.exit_date ? fmtDate(t.exit_date) : undefined,
    formattedPnL: fmtCurrency(pnl),
  } as EnrichedTrade;
}

// ── Section label ─────────────────────────────────────────────────────────────
function SecLabel({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: "0.6rem",
        color: "var(--text-tertiary)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
      }}
    >
      {label}
    </span>
  );
}

// ── Outcome badge ─────────────────────────────────────────────────────────────
function OutcomeBadge({
  outcome,
}: {
  outcome: "WIN" | "LOSS" | "BE" | "OPEN";
}) {
  const map = {
    WIN: { bg: "rgba(13,155,110,0.15)", color: PROFIT },
    LOSS: { bg: "rgba(224,82,82,0.15)", color: LOSS },
    BE: { bg: "rgba(142,182,155,0.12)", color: "#8EB69B" },
    OPEN: { bg: "rgba(44,194,153,0.12)", color: ACCENT },
  };
  const s = map[outcome];
  return (
    <span
      className="text-[0.58rem] font-bold rounded px-1.5 py-0.5 uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {outcome}
    </span>
  );
}

// ── Direction badge ───────────────────────────────────────────────────────────
function DirectionBadge({ d }: { d: "LONG" | "SHORT" }) {
  return d === "LONG" ? (
    <span
      className="flex items-center gap-0.5 text-[0.58rem] font-bold"
      style={{ color: PROFIT }}
    >
      <ArrowUpRight size={10} />
      LONG
    </span>
  ) : (
    <span
      className="flex items-center gap-0.5 text-[0.58rem] font-bold"
      style={{ color: LOSS }}
    >
      <ArrowDownRight size={10} />
      SHORT
    </span>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-[8px] px-3 py-2"
      style={{
        background: "var(--surface-elevated)",
        border: "1px solid var(--border-subtle)",
        flex: 1,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: "0.5rem",
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        className="font-bold tabular-nums truncate"
        style={{ fontSize: "0.85rem", color: color ?? "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Trade row ─────────────────────────────────────────────────────────────────
function TradeRow({
  trade,
  isSelected,
  hasNote,
  onClick,
}: {
  trade: Trade;
  isSelected: boolean;
  hasNote: boolean;
  onClick: () => void;
}) {
  const pnl = trade.pnl ?? 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all duration-150 rounded-[8px]"
      style={{
        padding: "10px 12px",
        background: isSelected ? "var(--surface-active)" : "transparent",
        borderLeft: isSelected
          ? `3px solid ${ACCENT}`
          : "3px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="font-bold tracking-tight"
            style={{
              fontSize: "0.88rem",
              color: isSelected ? ACCENT : "var(--text-primary)",
            }}
          >
            {trade.symbol}
          </span>
          <DirectionBadge d={trade.direction as "LONG" | "SHORT"} />
          <OutcomeBadge outcome={getOutcome(trade)} />
          {hasNote && (
            <FileText size={9} style={{ color: ACCENT, opacity: 0.7 }} />
          )}
        </div>
        <span
          className="font-semibold tabular-nums"
          style={{
            fontSize: "0.82rem",
            color: pnl > 0 ? PROFIT : pnl < 0 ? LOSS : "var(--text-tertiary)",
          }}
        >
          {fmtCurrency(trade.pnl)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>
          {fmtDate(trade.entry_date)}
        </span>
        {trade.r_multiple != null && (
          <span
            className="font-mono"
            style={{
              fontSize: "0.65rem",
              color: trade.r_multiple >= 0 ? PROFIT : LOSS,
              fontWeight: 600,
            }}
          >
            {fmtR(trade.r_multiple)}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Journal tab types ────────────────────────────────────────────────────────
type JournalTab = "notes" | "bias" | "setup" | "execution" | "psychology";

const TABS: { id: JournalTab; label: string; Icon: React.ElementType }[] = [
  { id: "notes", label: "Notes", Icon: FileText },
  { id: "bias", label: "Bias", Icon: BarChart2 },
  { id: "setup", label: "Setup", Icon: Layers },
  { id: "execution", label: "Execution", Icon: Zap },
  { id: "psychology", label: "Psychology", Icon: Brain },
];

// ─── TradeState: all mutable journal fields for one trade ─────────────────────
interface TradeJournalState {
  notes: string;
  feelings: string;
  observations: string;
  setupTags: string[];
  mistakeTags: string[];
  conviction: number | null;
  entryQuality: "Good" | "Neutral" | "Poor" | null;
  exitQuality: "Good" | "Neutral" | "Poor" | null;
  mae: number | null;
  mfe: number | null;
  tf_observations: Record<string, unknown>;
  executionNotes: string;
  executionArrays: string[];
  screenshots: TradeScreenshot[];
}

function defaultState(trade: Trade): TradeJournalState {
  const t = trade as unknown as Record<string, unknown>;
  return {
    notes: (t.notes as string) ?? "",
    feelings: (t.feelings as string) ?? "",
    observations: (t.observations as string) ?? "",
    setupTags: (t.setup_tags as string[]) ?? [],
    mistakeTags: (t.mistake_tags as string[]) ?? [],
    conviction: (t.conviction as number | null) ?? null,
    entryQuality:
      (t.entry_rating as "Good" | "Neutral" | "Poor" | null) ?? null,
    exitQuality: (t.exit_rating as "Good" | "Neutral" | "Poor" | null) ?? null,
    mae: (t.mae as number | null) ?? null,
    mfe: (t.mfe as number | null) ?? null,
    tf_observations: (t.tf_observations as Record<string, unknown>) ?? {},
    executionNotes: (t.execution_notes as string) ?? "",
    executionArrays: Array.isArray(t.execution_arrays)
      ? (t.execution_arrays as string[])
      : [],
    screenshots: Array.isArray(t.screenshots)
      ? (t.screenshots as unknown as TradeScreenshot[])
      : [],
  };
}

// ─── Screenshot uploader (hidden file input) ──────────────────────────────────
function useScreenshotUpload(
  tradeId: string,
  userId: string | undefined,
  onUploaded: (ss: TradeScreenshot) => void,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingTf, setPendingTf] = useState<string>("Execution");

  const trigger = (timeframe: string) => {
    setPendingTf(timeframe);
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const path = await uploadTradeScreenshot(file, userId);
      const {
        data: { publicUrl },
      } = supabase.storage.from("trade-screenshots").getPublicUrl(path);
      const newScreenshot: TradeScreenshot = {
        id: `temp-${Date.now()}`,
        trade_id: tradeId,
        url: publicUrl,
        timeframe: pendingTf,
        created_at: new Date().toISOString(),
      };
      onUploaded(newScreenshot);
    } catch (err) {
      console.error("[Screenshot upload]", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const inputEl = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFileChange}
    />
  );

  return { trigger, uploading, inputEl };
}

// ─── Fullscreen image overlay ─────────────────────────────────────────────────
function FullscreenImage({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.9)" }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Screenshot"
        className="max-w-[90vw] max-h-[90vh] rounded-[10px] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full p-2"
        style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

// ─── The journaling workspace for a selected trade ────────────────────────────
function TradeJournal({
  trade,
  userId,
  onSaved,
}: {
  trade: Trade;
  userId: string | undefined;
  onSaved: () => void;
}) {
  const [state, setState] = useState<TradeJournalState>(() =>
    defaultState(trade),
  );
  const [activeTab, setActiveTab] = useState<JournalTab>("notes");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const dirty = useRef(false);

  // Reset when trade changes
  useEffect(() => {
    setState(defaultState(trade));
    dirty.current = false;
    setSavedAt(null);
  }, [trade.id]);

  const update = (patch: Partial<TradeJournalState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    dirty.current = true;
  };

  // Enrich for BiasWidget — cast tf_observations through unknown to satisfy Json
  const enriched: EnrichedTrade = useMemo(
    () => ({
      ...toEnriched(trade),
      tf_observations:
        state.tf_observations as unknown as import("@/lib/supabase/types").Json,
    }),
    [trade, state.tf_observations],
  );

  const handleTradeUpdate = useCallback(
    (field: keyof EnrichedTrade, value: unknown) => {
      if (field === "tf_observations") {
        update({ tf_observations: value as Record<string, unknown> });
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

  // Save to Supabase
  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("trades")
        .update({
          // Core columns (always exist)
          notes: state.notes || null,
          feelings: state.feelings || null,
          observations: state.observations || null,
          screenshots: state.screenshots.length ? state.screenshots : null,
          // Journal v2 columns (added by migration 20260227000000_journal_missing_columns)
          tf_observations: Object.keys(state.tf_observations).length
            ? state.tf_observations
            : null,
          setup_tags: state.setupTags.length ? state.setupTags : null,
          mistake_tags: state.mistakeTags.length ? state.mistakeTags : null,
          conviction: state.conviction,
          entry_rating: state.entryQuality,
          exit_rating: state.exitQuality,
          mae: state.mae,
          mfe: state.mfe,
          execution_notes: state.executionNotes || null,
          execution_arrays: state.executionArrays.length
            ? state.executionArrays
            : null,
        })
        .eq("id", trade.id);

      if (error) {
        console.error("[Journal save error]", error.message, error.details);
        return;
      }
      dirty.current = false;
      setSavedAt(new Date());
      onSaved();
    } catch (e) {
      console.error("[Journal save]", e);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save after 2.5 s of inactivity
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(handleSave, 2500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {inputEl}

      {/* ── Trade header bar ─────────────────────────────────────────── */}
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
          <OutcomeBadge outcome={getOutcome(trade)} />
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
                color: trade.r_multiple >= 0 ? PROFIT : LOSS,
              }}
            >
              {fmtR(trade.r_multiple)}
            </span>
          )}
          {/* Save status */}
          {saving ? (
            <span
              style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}
            >
              Saving…
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
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 font-semibold transition-all shrink-0"
            style={{
              background: ACCENT,
              color: "#051F20",
              fontSize: "0.72rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#3DD4AA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
          >
            <Save size={11} strokeWidth={2.2} />
            Save
          </button>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────── */}
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

      {/* ── Tab content ──────────────────────────────────────────────── */}
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
            {/* ── NOTES ──────────────────────────────────────────────── */}
            {activeTab === "notes" && (
              <div className="p-5 space-y-5">
                {/* Main notes textarea */}
                <div className="space-y-2">
                  <SecLabel label="Trade Journal Entry" />
                  <textarea
                    value={state.notes}
                    onChange={(e) => update({ notes: e.target.value })}
                    placeholder={`Write about this trade…\n\n• What was the setup and did it match your playbook?\n• How did you manage the position — any deviations?\n• What was your psychology like during the trade?\n• Key lessons and what you'd do differently.`}
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
                      (e.target.style.borderColor = `rgba(44,194,153,0.35)`)
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
                      value={state.entryQuality}
                      onChange={(v) => update({ entryQuality: v })}
                    />
                  </div>
                  <div className="space-y-2">
                    <QualityRating
                      label="Exit Quality"
                      value={state.exitQuality}
                      onChange={(v) => update({ exitQuality: v })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── BIAS ───────────────────────────────────────────────── */}
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

            {/* ── SETUP ──────────────────────────────────────────────── */}
            {activeTab === "setup" && (
              <div className="p-5 space-y-6">
                {/* Screenshots */}
                <div className="space-y-2">
                  <SecLabel label="Screenshots" />
                  <ScreenshotGallery
                    screenshots={state.screenshots}
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
                      Uploading screenshot…
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

            {/* ── EXECUTION ──────────────────────────────────────────── */}
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
                  screenshots={state.screenshots.filter(
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

            {/* ── PSYCHOLOGY ─────────────────────────────────────────── */}
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
  const [noteIds, setNoteIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [direction, setDirection] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [ts, { data: entries }] = await Promise.all([
        getTrades({ propAccountId: selectedAccountId }),
        supabase
          .from("journal_entries")
          .select("trade_id")
          .not("trade_id", "is", null),
      ]);
      setTrades(ts);
      setNoteIds(
        new Set((entries ?? []).map((e: { trade_id: string }) => e.trade_id)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (outcome !== "all" && getOutcome(t) !== outcome) return false;
      if (direction !== "all" && t.direction !== direction) return false;
      return true;
    });
  }, [trades, search, outcome, direction]);

  const stats = useMemo(() => {
    const closed = filtered.filter((t) => t.status === "closed");
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
    const total = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    return {
      total,
      winRate: closed.length
        ? Math.round((wins.length / closed.length) * 100)
        : 0,
      tradeCount: closed.length,
      openCount: filtered.filter((t) => t.status === "open").length,
    };
  }, [filtered]);

  return (
    <div
      className="flex h-[calc(100vh-52px)] overflow-hidden"
      style={{ background: "var(--app-bg)" }}
    >
      {/* ═══ LEFT — Trade List ═══════════════════════════════════════════════ */}
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
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={13} style={{ color: ACCENT }} />
            <span
              className="font-bold"
              style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}
            >
              Journal
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={load}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <RefreshCw size={11} strokeWidth={1.8} />
            </button>
            <Link
              href="/trades?new=true"
              className="flex items-center gap-1 rounded-[6px] px-2 py-1 font-semibold"
              style={{
                background: ACCENT,
                color: "#051F20",
                fontSize: "0.68rem",
              }}
            >
              <Plus size={10} strokeWidth={2.5} />
              New
            </Link>
          </div>
        </div>

        {/* Stats strip */}
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

        {/* Search row */}
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
              placeholder="Search symbol…"
              className="flex-1 min-w-0 bg-transparent outline-none py-1.5"
              style={{ fontSize: "0.73rem", color: "var(--text-primary)" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              >
                <X size={9} />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips row */}
        <div
          className="flex items-center gap-2 px-3 pb-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          {/* Outcome toggles */}
          <div
            className="flex rounded-[6px] overflow-hidden shrink-0"
            style={{ border: "1px solid var(--border-subtle)" }}
          >
            {(["all", "WIN", "LOSS", "OPEN"] as const).map((val, i) => (
              <button
                key={val}
                onClick={() => setOutcome(val)}
                className="font-semibold transition-colors"
                style={{
                  fontSize: "0.62rem",
                  padding: "4px 7px",
                  background:
                    outcome === val ? ACCENT + "22" : "var(--surface-elevated)",
                  color: outcome === val ? ACCENT : "var(--text-tertiary)",
                  borderRight:
                    i < 3 ? "1px solid var(--border-subtle)" : undefined,
                  whiteSpace: "nowrap",
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
            ))}
          </div>

          {/* Direction toggles */}
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
                  color: direction === val ? ACCENT : "var(--text-tertiary)",
                  borderRight:
                    i < 2 ? "1px solid var(--border-subtle)" : undefined,
                  whiteSpace: "nowrap",
                }}
              >
                {val === "all" ? "All" : val === "LONG" ? "L" : "S"}
              </button>
            ))}
          </div>

          <span
            className="ml-auto shrink-0"
            style={{ fontSize: "0.6rem", color: "var(--text-tertiary)" }}
          >
            {filtered.length}/{trades.length}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading ? (
            <div
              className="flex items-center justify-center h-32"
              style={{ color: "var(--text-tertiary)" }}
            >
              <Activity size={20} style={{ opacity: 0.3 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-32 gap-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              <FileText size={20} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: "0.72rem" }}>No trades match</p>
            </div>
          ) : (
            <div className="space-y-0.5 py-1">
              {filtered.map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  isSelected={selectedTrade?.id === trade.id}
                  hasNote={noteIds.has(trade.id)}
                  onClick={() => setSelectedTrade(trade)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 shrink-0 flex justify-between"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <span style={{ fontSize: "0.62rem", color: "var(--text-tertiary)" }}>
            {filtered.length} of {trades.length} trades
          </span>
          {stats.openCount > 0 && (
            <span
              style={{ fontSize: "0.62rem", color: ACCENT, fontWeight: 600 }}
            >
              {stats.openCount} open
            </span>
          )}
        </div>
      </aside>

      {/* ═══ CENTER — Journal Workspace ══════════════════════════════════════ */}
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
                onSaved={load}
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
                  background: "rgba(44,194,153,0.08)",
                  border: "1px solid rgba(44,194,153,0.15)",
                }}
              >
                <BookOpen size={28} style={{ color: ACCENT, opacity: 0.7 }} />
              </div>
              <div className="text-center max-w-sm">
                <p
                  className="font-bold mb-1.5"
                  style={{ fontSize: "1rem", color: "var(--text-primary)" }}
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
                  Choose any trade from the left panel to write notes, track
                  your bias, rate execution quality, tag ICT setups, and reflect
                  on your psychology.
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
              <Link
                href="/trades?new=true"
                className="flex items-center gap-2 rounded-[8px] px-4 py-2 font-semibold transition-all"
                style={{
                  background: ACCENT,
                  color: "#051F20",
                  fontSize: "0.8rem",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#3DD4AA")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = ACCENT)
                }
              >
                <Plus size={13} />
                Log a Trade
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
