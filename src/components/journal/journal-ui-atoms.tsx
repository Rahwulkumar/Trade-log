// ─── Journal UI Atoms ───────────────────────────────────────────────────────
// Small, reusable presentational components shared across Journal pages.
// Extracted from journal-client.tsx during Phase 3 decomposition.
// ────────────────────────────────────────────────────────────────────────────

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  PROFIT,
  LOSS_COLOR as LOSS,
  ACCENT,
} from "@/components/journal/utils/format";

// ── Section label ───────────────────────────────────────────────────────────

export function SecLabel({ label }: { label: string }) {
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

// ── Outcome badge ───────────────────────────────────────────────────────────

export function OutcomeBadge({
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

// ── Direction badge ─────────────────────────────────────────────────────────

export function DirectionBadge({ d }: { d: "LONG" | "SHORT" }) {
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

// ── Stat pill ───────────────────────────────────────────────────────────────

export function StatPill({
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
