/**
 * Empty State — with context-aware animated SVG illustrations and conversational copy
 */
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  /** Renders an inline SVG illustration appropriate to the context */
  illustration?: "trades" | "notes" | "analytics" | "search" | "generic";
}

// ─── Inline SVG Illustrations ────────────────────────────────────────────────

function IllustrationTrades() {
  return (
    <svg
      width="120"
      height="80"
      viewBox="0 0 120 80"
      fill="none"
      className="float"
      style={{ filter: "drop-shadow(0 8px 24px var(--accent-glow))" }}
    >
      {/* Grid lines */}
      {[20, 40, 60].map((y) => (
        <line
          key={y}
          x1="8"
          y1={y}
          x2="112"
          y2={y}
          stroke="var(--border-default)"
          strokeWidth="0.75"
          strokeDasharray="3 3"
        />
      ))}
      {/* Candlestick bars */}
      {[
        {
          x: 18,
          high: 15,
          open: 25,
          close: 40,
          low: 55,
          color: "var(--profit-primary)",
        },
        {
          x: 36,
          high: 30,
          open: 50,
          close: 35,
          low: 60,
          color: "var(--loss-primary)",
        },
        {
          x: 54,
          high: 12,
          open: 20,
          close: 38,
          low: 50,
          color: "var(--profit-primary)",
        },
        {
          x: 72,
          high: 22,
          open: 32,
          close: 18,
          low: 45,
          color: "var(--profit-primary)",
        },
        {
          x: 90,
          high: 10,
          open: 18,
          close: 32,
          low: 42,
          color: "var(--profit-primary)",
        },
      ].map((c, i) => (
        <g key={i}>
          {/* Wick */}
          <line
            x1={c.x}
            y1={c.high}
            x2={c.x}
            y2={c.low}
            stroke={c.color}
            strokeWidth="1"
            strokeOpacity="0.5"
          />
          {/* Body */}
          <rect
            x={c.x - 5}
            y={Math.min(c.open, c.close)}
            width={10}
            height={Math.abs(c.close - c.open)}
            rx="1.5"
            fill={c.color}
            fillOpacity="0.85"
          />
        </g>
      ))}
      {/* Trend line */}
      <polyline
        points="18,40 36,43 54,29 72,20 90,15"
        stroke="var(--accent-primary)"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        fill="none"
        className="draw-line"
      />
      {/* Dot at end */}
      <circle cx="90" cy="15" r="3" fill="var(--accent-primary)" />
    </svg>
  );
}

function IllustrationNotes() {
  return (
    <svg
      width="100"
      height="80"
      viewBox="0 0 100 80"
      fill="none"
      className="float"
      style={{
        animationDelay: "0.3s",
        filter: "drop-shadow(0 8px 24px var(--accent-glow))",
      }}
    >
      {/* Page */}
      <rect
        x="20"
        y="8"
        width="60"
        height="64"
        rx="6"
        fill="var(--surface-elevated)"
        stroke="var(--border-default)"
        strokeWidth="1.5"
      />
      {/* Lines */}
      {[22, 32, 42, 52].map((y, i) => (
        <line
          key={y}
          x1="30"
          y1={y}
          x2={i % 2 === 0 ? 70 : 60}
          y2={y}
          stroke="var(--border-active)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      ))}
      {/* Scribble accent line */}
      <path
        d="M30 62 Q40 59 50 62 Q60 65 70 62"
        stroke="var(--accent-primary)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        className="draw-line"
      />
      {/* Corner fold */}
      <path d="M68 8 L80 20 L68 20 Z" fill="var(--surface-hover)" />
    </svg>
  );
}

function IllustrationSearch() {
  return (
    <svg
      width="90"
      height="80"
      viewBox="0 0 90 80"
      fill="none"
      className="float"
      style={{ animationDelay: "0.2s" }}
    >
      {/* Magnifying glass */}
      <circle
        cx="38"
        cy="36"
        r="20"
        stroke="var(--border-active)"
        strokeWidth="2"
      />
      <circle
        cx="38"
        cy="36"
        r="13"
        stroke="var(--border-default)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <line
        x1="52"
        y1="50"
        x2="66"
        y2="64"
        stroke="var(--border-active)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Question mark inside */}
      <text
        x="33"
        y="41"
        fontSize="14"
        fontWeight="700"
        fill="var(--text-tertiary)"
        fontFamily="monospace"
      >
        ?
      </text>
    </svg>
  );
}

function IllustrationGeneric() {
  return (
    <svg
      width="100"
      height="80"
      viewBox="0 0 100 80"
      fill="none"
      className="float"
    >
      {/* Dashed box */}
      <rect
        x="18"
        y="12"
        width="64"
        height="56"
        rx="8"
        stroke="var(--border-active)"
        strokeWidth="1.5"
        strokeDasharray="5 3"
      />
      {/* Circles */}
      <circle
        cx="50"
        cy="35"
        r="12"
        fill="var(--surface-elevated)"
        stroke="var(--border-default)"
        strokeWidth="1.5"
      />
      <circle
        cx="50"
        cy="35"
        r="4"
        fill="var(--accent-primary)"
        fillOpacity="0.3"
      />
      {/* Horizontal lines below */}
      <line
        x1="30"
        y1="56"
        x2="70"
        y2="56"
        stroke="var(--border-default)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="36"
        y1="62"
        x2="64"
        y2="62"
        stroke="var(--border-default)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

const illustrations = {
  trades: IllustrationTrades,
  notes: IllustrationNotes,
  analytics: IllustrationTrades,
  search: IllustrationSearch,
  generic: IllustrationGeneric,
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  illustration = "generic",
}: EmptyStateProps) {
  const Illustration = illustrations[illustration];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-14 px-6 text-center card-enter",
        "rounded-[var(--radius-xl)]",
        className,
      )}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Illustration / Icon */}
      <div className="mb-5">
        {icon ? (
          <div
            className="flex items-center justify-center w-14 h-14 rounded-[var(--radius-lg)] float"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-primary)",
            }}
          >
            {icon}
          </div>
        ) : (
          <Illustration />
        )}
      </div>

      {/* Title */}
      <h3
        className="font-semibold mb-2 leading-snug"
        style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className="max-w-xs mb-6 leading-relaxed"
          style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2"
          style={{
            background: "var(--accent-primary)",
            color: "#000",
            padding: "0.5rem 1.2rem",
            borderRadius: "var(--radius-default)",
            fontSize: "0.8rem",
            fontWeight: 600,
            transition: "opacity 0.15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Plus size={13} />
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── Specialised empty states ─────────────────────────────────────────────────

export function NoTradesEmpty({ onAddTrade }: { onAddTrade?: () => void }) {
  return (
    <EmptyState
      illustration="trades"
      title="No trades logged yet"
      description="Your edge shows up in your data. Start logging trades and watch the patterns emerge."
      action={
        onAddTrade
          ? { label: "Log your first trade", onClick: onAddTrade }
          : undefined
      }
    />
  );
}

export function NoDataEmpty() {
  return (
    <EmptyState
      illustration="generic"
      title="Nothing to show here"
      description="Try widening your date range or clearing your filters — the data's in there somewhere."
    />
  );
}
