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
  ChevronLeft,
  Edit3,
  Tag,
  Camera,
  Zap,
  Heart,
  Layers,
  PenLine,
  Library,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getTrades } from "@/lib/api/trades";
import { uploadTradeScreenshot } from "@/lib/api/storage";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import type { Trade, TradeScreenshot } from "@/lib/supabase/types";
import type { EnrichedTrade } from "@/domain/trade-types";

// â”€â”€ Journal library view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  JournalLibrary,
  isJournaled,
  type JournalTrade,
} from "@/components/journal/journal-library";

// â”€â”€ Existing journal widgets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { BiasWidget } from "@/components/journal/bias-widget";
import { MaeMfeCard } from "@/components/journal/mae-mfe-card";
import { PsychologyWidget } from "@/components/journal/psychology-widget";
import { ExecutionWidget } from "@/components/journal/execution-widget";
import { TagSelector } from "@/components/journal/tag-selector";
import { QualityRating } from "@/components/journal/quality-rating";
import { ConvictionStars } from "@/components/journal/conviction-stars";
import { ScreenshotGallery } from "@/components/journal/screenshot-gallery";

// â”€â”€â”€ Color palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PROFIT = "#0D9B6E"; // matches --profit-primary
const LOSS = "#FF4455"; // matches --loss-primary
const ACCENT = "#2CC299"; // matches --accent-secondary

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "â€”";
  return (n >= 0 ? "+" : "") + "$" + Math.abs(n).toFixed(2);
}
function fmtR(n: number | null | undefined) {
  if (n == null) return "â€”";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "R";
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "â€”";
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

// ðŸ”– Read mode â†’ see JournalLibrary in @/components/journal/journal-library.tsx

// â”€â”€ Section label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Outcome badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Direction badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Stat pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Trade row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Journal tab types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type JournalTab = "notes" | "bias" | "setup" | "execution" | "psychology";

const TABS: { id: JournalTab; label: string; Icon: React.ElementType }[] = [
  { id: "notes", label: "Notes", Icon: FileText },
  { id: "bias", label: "Bias", Icon: BarChart2 },
  { id: "setup", label: "Setup", Icon: Layers },
  { id: "execution", label: "Execution", Icon: Zap },
  { id: "psychology", label: "Psychology", Icon: Brain },
];

// â”€â”€â”€ TradeState: all mutable journal fields for one trade â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Screenshot uploader (hidden file input) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Fullscreen image overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ The journaling workspace for a selected trade â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Enrich for BiasWidget â€” cast tf_observations through unknown to satisfy Json
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

      {/* â”€â”€ Trade header bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              Savingâ€¦
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
          {/* Back to view â€” only shown when trade already has journal data */}
          {onBackToView && (
            <button
              onClick={onBackToView}
              className="flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 font-semibold transition-all shrink-0"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
                fontSize: "0.72rem",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--border-default)")
              }
            >
              <ChevronLeft size={11} strokeWidth={2.2} />
              View
            </button>
          )}
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

      {/* â”€â”€ Tab bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ Tab content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
            {/* â”€â”€ NOTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {activeTab === "notes" && (
              <div className="p-5 space-y-5">
                {/* Main notes textarea */}
                <div className="space-y-2">
                  <SecLabel label="Trade Journal Entry" />
                  <textarea
                    value={state.notes}
                    onChange={(e) => update({ notes: e.target.value })}
                    placeholder={`Write about this tradeâ€¦\n\nâ€¢ What was the setup and did it match your playbook?\nâ€¢ How did you manage the position â€” any deviations?\nâ€¢ What was your psychology like during the trade?\nâ€¢ Key lessons and what you'd do differently.`}
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

            {/* â”€â”€ BIAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

            {/* â”€â”€ SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                      Uploading screenshotâ€¦
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

            {/* â”€â”€ EXECUTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

            {/* â”€â”€ PSYCHOLOGY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
      const ts = await getTrades({ propAccountId: selectedAccountId });
      setTrades(ts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    load();
  }, [load]);

  // In log mode we only show UN-journaled trades
  const pendingTrades = useMemo(() => {
    return trades.filter((t) => {
      if (isJournaled(t)) return false;
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (outcome !== "all" && getOutcome(t) !== outcome) return false;
      if (direction !== "all" && t.direction !== direction) return false;
      return true;
    });
  }, [trades, search, outcome, direction]);

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
      className="flex flex-col h-[calc(100vh-52px)] overflow-hidden"
      style={{ background: "var(--app-bg)" }}
    >
      {/* === TOP BAR — morphs into breadcrumb when an entry is open === */}
      <div
        className="flex items-center justify-between px-5 py-2.5 shrink-0"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface)",
        }}
      >
        {entryTrade ? (
          /* ── Entry breadcrumb mode ── */
          <>
            <button
              onClick={() => setEntryTrade(null)}
              className="flex items-center gap-1.5 transition-colors"
              style={{
                color: "var(--text-tertiary)",
                fontSize: "0.72rem",
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-tertiary)")
              }
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
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
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
            {/* spacer */}
          </>
        ) : (
          /* ── Normal mode switcher ── */
          <>
            <div className="flex items-center gap-2">
              <BookOpen size={14} style={{ color: ACCENT }} />
              <span
                className="font-bold"
                style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}
              >
                Journal
              </span>
            </div>

            <div
              className="flex rounded-[10px] overflow-hidden"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-subtle)",
                padding: 3,
              }}
            >
              {[
                {
                  id: "library" as const,
                  label: "Journal Library",
                  Icon: Library,
                },
                { id: "log" as const, label: "Log a Trade", Icon: PenLine },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setPageMode(id);
                    setSelectedTrade(null);
                  }}
                  className="flex items-center gap-1.5 rounded-[7px] px-4 py-1.5 font-semibold transition-all"
                  style={{
                    fontSize: "0.72rem",
                    background:
                      pageMode === id ? "var(--surface)" : "transparent",
                    color:
                      pageMode === id
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    boxShadow: pageMode === id ? "var(--shadow-sm)" : "none",
                  }}
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </div>

            <Link
              href="/trades?new=true"
              className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 font-semibold transition-all"
              style={{
                background: ACCENT,
                color: "#051F20",
                fontSize: "0.72rem",
              }}
            >
              <Plus size={11} strokeWidth={2.5} />
              New Trade
            </Link>
          </>
        )}
      </div>

      {/* === BODY === */}
      <div className="flex-1 overflow-hidden flex">
        {/* LIBRARY MODE */}
        {pageMode === "library" && (
          <div className="flex-1 overflow-hidden">
            <JournalLibrary
              trades={trades}
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
                      style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
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
                  {(["all", "WIN", "LOSS", "OPEN"] as const).map((val, i) => (
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
                          outcome === val ? ACCENT : "var(--text-tertiary)",
                        borderRight:
                          i < 3 ? "1px solid var(--border-subtle)" : undefined,
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
                          direction === val ? ACCENT : "var(--text-tertiary)",
                        borderRight:
                          i < 2 ? "1px solid var(--border-subtle)" : undefined,
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
                  style={{ fontSize: "0.62rem", color: "var(--text-tertiary)" }}
                >
                  {pendingTrades.length} pending Â·{" "}
                  {trades.filter(isJournaled).length} journaled
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
                        background: "rgba(44,194,153,0.08)",
                        border: "1px solid rgba(44,194,153,0.15)",
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
  );
}
