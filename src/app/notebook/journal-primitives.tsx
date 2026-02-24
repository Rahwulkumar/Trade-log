"use client";
// ─── Journal Primitives — compact, dense, same design system ──────────────
// Matches: AppPanel, glow-card, seg-control/seg-item, text-label, badge-*,
// surface/surface-elevated, border-subtle/default, accent-primary/soft/muted

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { getScreenshotUrl } from "@/lib/api/storage";
import type { TradeScreenshot } from "@/lib/supabase/types";

/* ═══ Mini label — consistent uppercase 0.58rem ═════════════════════════ */
export function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[0.58rem] uppercase tracking-widest font-bold mb-1",
        className,
      )}
      style={{ color: "var(--text-tertiary)" }}
    >
      {children}
    </p>
  );
}

/* ═══ Compact field row — label left, control right ═════════════════════ */
export function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-1.5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <span
        className="text-[0.72rem] font-medium shrink-0"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1 justify-end">{children}</div>
    </div>
  );
}

/* ═══ Stat value — right-aligned mono ═══════════════════════════════════ */
export function StatValue({
  value,
  isGain,
}: {
  value: string;
  isGain?: boolean;
}) {
  return (
    <span
      className="mono text-[0.76rem] font-semibold"
      style={{
        color:
          isGain === true
            ? "var(--profit-primary)"
            : isGain === false
              ? "var(--loss-primary)"
              : "var(--text-primary)",
      }}
    >
      {value}
    </span>
  );
}

/* ═══ Compact chip — tight, 0.62rem ════════════════════════════════════ */
export function Chip({
  label,
  active,
  onClick,
  disabled,
  style,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="text-[0.62rem] font-semibold px-2 py-1 rounded-full transition-all border disabled:opacity-30"
      style={
        active
          ? (style ?? {
              background: "var(--accent-primary)",
              color: "#fff",
              borderColor: "var(--accent-primary)",
            })
          : {
              background: "transparent",
              color: "var(--text-tertiary)",
              borderColor: "var(--border-default)",
            }
      }
    >
      {label}
    </button>
  );
}

/* ═══ ChipGroup — flex wrap of chips ═══════════════════════════════════ */
export function ChipGroup({
  options,
  value,
  onChange,
  disabled,
  colorFn,
}: {
  options: readonly string[];
  value: string | string[] | null | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
  colorFn?: (o: string, active: boolean) => React.CSSProperties | undefined;
}) {
  const activeSet = new Set(
    Array.isArray(value) ? value : value ? [value] : [],
  );
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <Chip
          key={o}
          label={o}
          active={activeSet.has(o)}
          disabled={disabled}
          onClick={() => onChange(o)}
          style={colorFn?.(o, activeSet.has(o))}
        />
      ))}
    </div>
  );
}

/* ═══ Creatable tag picker — search, select, or create inline ═══════════ */
export function CreatableTagPicker({
  allTags,
  selected,
  onToggle,
  onCreateTag,
  disabled,
  label,
}: {
  allTags: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onCreateTag?: (tag: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const results = useMemo(
    () =>
      q
        ? allTags.filter((s) => s.toLowerCase().includes(q.toLowerCase()))
        : allTags,
    [allTags, q],
  );
  const canCreate =
    q.trim() &&
    !allTags.some((t) => t.toLowerCase() === q.trim().toLowerCase());

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref}>
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-0.5 text-[0.6rem] font-medium px-1.5 py-0.5 rounded"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-primary)",
                border: "1px solid var(--accent-muted)",
              }}
            >
              {s}
              {!disabled && (
                <button
                  onClick={() => onToggle(s)}
                  className="opacity-50 hover:opacity-100 ml-0.5"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="text-[0.62rem] font-medium px-2 py-1 rounded border transition-colors hover:bg-[var(--surface-elevated)]"
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-tertiary)",
            }}
          >
            + Add
          </button>
          {open && (
            <div
              className="absolute top-full left-0 mt-1 z-40 w-52 rounded-[var(--radius-md)] border overflow-hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-default)",
                boxShadow: "var(--shadow-elevated)",
              }}
            >
              <div
                className="px-2.5 py-1.5 border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search or create..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canCreate) {
                      onCreateTag?.(q.trim());
                      onToggle(q.trim());
                      setQ("");
                      setOpen(false);
                    }
                  }}
                  className="w-full text-[0.68rem] bg-transparent focus:outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <div className="max-h-36 overflow-y-auto p-0.5">
                {canCreate && (
                  <button
                    onClick={() => {
                      onCreateTag?.(q.trim());
                      onToggle(q.trim());
                      setQ("");
                      setOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 rounded text-[0.68rem] font-semibold transition-colors hover:bg-[var(--surface-elevated)]"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    + Create &ldquo;{q.trim()}&rdquo;
                  </button>
                )}
                {results
                  .filter((r) => !selected.includes(r))
                  .map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        onToggle(r);
                        setQ("");
                      }}
                      className="w-full text-left px-2 py-1 rounded text-[0.68rem] transition-colors hover:bg-[var(--surface-elevated)]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {r}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ Compact textarea — 0.72rem, tight padding ════════════════════════ */
export function CompactTextarea({
  value,
  onChange,
  placeholder,
  rows,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 2}
      className="w-full text-[0.72rem] leading-relaxed px-2.5 py-2 rounded-[var(--radius-sm)] border bg-transparent focus:outline-none focus:ring-1 resize-none disabled:opacity-30"
      style={
        {
          borderColor: "var(--border-default)",
          color: "var(--text-primary)",
          "--tw-ring-color": "var(--accent-primary)",
        } as React.CSSProperties
      }
    />
  );
}

/* ═══ Compact input — 0.72rem ══════════════════════════════════════════ */
export function CompactInput({
  value,
  onChange,
  placeholder,
  type,
  disabled,
}: {
  value: string | number | null | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type ?? "text"}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "—"}
      className="w-full text-[0.72rem] mono px-2.5 py-1.5 rounded-[var(--radius-sm)] border bg-transparent focus:outline-none focus:ring-1 disabled:opacity-30"
      style={
        {
          borderColor: "var(--border-default)",
          color: "var(--text-primary)",
          "--tw-ring-color": "var(--accent-primary)",
        } as React.CSSProperties
      }
    />
  );
}

/* ═══ Named Screenshot Grid — compact thumbnails with caption ═══════════ */
export function NamedScreenshotGrid({
  screenshots,
  tf,
  isDummy,
  onUpload,
  onView,
}: {
  screenshots: (TradeScreenshot & { caption?: string | null })[];
  tf: string;
  isDummy: boolean;
  onUpload: (tf: string, name: string) => void;
  onView: (url: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const items = screenshots.filter(
    (s) => (s.timeframe ?? "").toLowerCase() === tf.toLowerCase(),
  );
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s, i) => {
        const url = s.url?.startsWith("http") ? s.url : getScreenshotUrl(s.url);
        return (
          <button
            key={i}
            onClick={() => onView(url)}
            className="relative w-16 h-11 overflow-hidden rounded-[var(--radius-sm)] border transition-shadow hover:shadow-md"
            style={{ borderColor: "var(--border-default)" }}
          >
            <Image src={url} alt="" fill className="object-cover" unoptimized />
          </button>
        );
      })}
      {!isDummy && !naming && (
        <button
          onClick={() => setNaming(true)}
          className="w-16 h-11 flex items-center justify-center rounded-[var(--radius-sm)] border border-dashed transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--accent-soft)]"
          style={{
            borderColor: "var(--border-active)",
            color: "var(--text-tertiary)",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M10 4v12M4 10h12" />
          </svg>
        </button>
      )}
      {naming && (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name..."
            className="text-[0.68rem] px-2 py-1 w-24 rounded border bg-transparent focus:outline-none"
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onUpload(tf, name || tf);
                setName("");
                setNaming(false);
              }
              if (e.key === "Escape") {
                setName("");
                setNaming(false);
              }
            }}
          />
          <button
            onClick={() => {
              onUpload(tf, name || tf);
              setName("");
              setNaming(false);
            }}
            className="text-[0.6rem] font-semibold px-1.5 py-1 rounded"
            style={{ background: "var(--accent-primary)", color: "#fff" }}
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══ Quality rating — Good / Neutral / Poor inline ════════════════════ */
export function QualityRating({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <FieldRow label={label}>
      {(["Good", "Neutral", "Poor"] as const).map((opt) => {
        const on = value === opt;
        const col =
          opt === "Good"
            ? "var(--profit-primary)"
            : opt === "Poor"
              ? "var(--loss-primary)"
              : "var(--text-secondary)";
        const bg =
          opt === "Good"
            ? "var(--profit-bg)"
            : opt === "Poor"
              ? "var(--loss-bg)"
              : "var(--surface-elevated)";
        return (
          <button
            key={opt}
            disabled={disabled}
            onClick={() => onChange(on ? null : opt)}
            className="text-[0.58rem] font-semibold px-2 py-0.5 rounded-full transition-all border disabled:opacity-30"
            style={
              on
                ? { background: bg, color: col, borderColor: col }
                : {
                    background: "transparent",
                    color: "var(--text-tertiary)",
                    borderColor: "var(--border-default)",
                  }
            }
          >
            {opt}
          </button>
        );
      })}
    </FieldRow>
  );
}

/* ═══ Bias chip colors ═════════════════════════════════════════════════ */
export const biasColorFn = (
  o: string,
  on: boolean,
): React.CSSProperties | undefined => {
  if (!on) return undefined;
  if (o === "Bullish")
    return {
      background: "var(--profit-bg)",
      color: "var(--profit-primary)",
      borderColor: "var(--profit-primary)",
    };
  if (o === "Bearish")
    return {
      background: "var(--loss-bg)",
      color: "var(--loss-primary)",
      borderColor: "var(--loss-primary)",
    };
  return {
    background: "var(--surface-elevated)",
    color: "var(--text-secondary)",
    borderColor: "var(--border-active)",
  };
};

/* ═══ Session auto-detection ═════════════════════════════════════════ */
const SESSION_RANGES = [
  { id: "Asian", start: 0, end: 8 },
  { id: "London", start: 8, end: 12 },
  { id: "New York", start: 12, end: 17 },
  { id: "London Close", start: 17, end: 21 },
] as const;

export function detectSession(entryDate: string): string {
  const h = new Date(entryDate).getUTCHours();
  return (
    SESSION_RANGES.find(({ start, end }) => h >= start && h < end)?.id ??
    "Asian"
  );
}

/* ═══ Constants ══════════════════════════════════════════════════════ */
export const SESSIONS = [
  "Asian",
  "London",
  "New York",
  "London Close",
] as const;
export const GRADES = ["A+", "A", "B", "C", "D"] as const;
export const FEELINGS = [
  "Calm",
  "Confident",
  "Patient",
  "Disciplined",
  "Focused",
  "Anxious",
  "FOMO",
  "Impulsive",
  "Revenge",
  "Bored",
  "Rushed",
  "Greedy",
];
export const CONFLUENCES = [
  "HTF alignment",
  "SMT divergence",
  "Liquidity sweep",
  "Displacement",
  "Session timing",
  "News catalyst",
  "Institutional flow",
  "Premium/Discount",
];
export const MARKET_CONDITIONS = [
  "Trending",
  "Ranging",
  "Volatile",
  "Low Volume",
  "Pre-News",
  "Post-News",
  "Consolidation",
  "Breakout",
];
export const MISTAKES = [
  "Chased entry",
  "Moved SL",
  "Over-leveraged",
  "No plan",
  "Late exit",
  "Early exit",
  "Wrong session",
  "Counter-trend",
  "Revenge trade",
  "FOMO entry",
  "Ignored confluences",
];

export const ICT_BIAS = [
  "Order Block",
  "Fair Value Gap",
  "Breaker Block",
  "Rejection Block",
  "Propulsion Block",
  "Liquidity Void",
  "PDH",
  "PDL",
  "PWH",
  "PWL",
  "Premium Zone",
  "Discount Zone",
  "BSL Sweep",
  "SSL Sweep",
  "Bullish MSS",
  "Bearish MSS",
  "Inducement",
  "NWOG",
  "NDOG",
  "Dealing Range",
];
export const ICT_EXEC = [
  "FVG Entry",
  "OB Entry",
  "Mitigation Block",
  "Turtle Soup",
  "Judas Swing",
  "ICT Killzone",
  "Silver Bullet",
  "CISD",
  "Optimal Trade Entry",
  "Unicorn Model",
  "NYC AM Open",
  "London Open",
  "2022 Model",
  "Power of 3",
];

/** Smart TF filter — only show relevant timeframes based on trade duration */
export function getSmartTimeframes(
  entryDate: string,
  exitDate: string | null,
): string[] {
  if (!exitDate) return ["Daily", "4H", "1H", "15m", "5m"];
  const hours =
    (new Date(exitDate).getTime() - new Date(entryDate).getTime()) / 3_600_000;
  if (hours <= 1) return ["1H", "15m", "5m", "1m"];
  if (hours <= 4) return ["4H", "1H", "15m", "5m"];
  if (hours <= 24) return ["Daily", "4H", "1H", "15m"];
  if (hours <= 168) return ["Weekly", "Daily", "4H", "1H"];
  return ["Monthly", "Weekly", "Daily", "4H"];
}
