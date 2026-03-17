"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import {
  RefreshCw,
  AlertTriangle,
  Clock,
  TrendingUp,
  Sparkles,
  Zap,
} from "lucide-react";
import type { EconomicEvent } from "@/app/api/news/economic-calendar/route";
import { NewsAIAgent } from "@/components/news/news-ai-agent";
import { Button } from "@/components/ui/button";

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "USD", flag: "🇺🇸", name: "US Dollar" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound" },
  { code: "JPY", flag: "🇯🇵", name: "Japanese Yen" },
  { code: "CAD", flag: "🇨🇦", name: "Canadian Dollar" },
  { code: "AUD", flag: "🇦🇺", name: "Australian Dollar" },
  { code: "CHF", flag: "🇨🇭", name: "Swiss Franc" },
  { code: "NZD", flag: "🇳🇿", name: "New Zealand Dollar" },
  { code: "CNY", flag: "🇨🇳", name: "Chinese Yuan" },
];

// Currency code → accent colour for the chip in event rows
const CURRENCY_COLOR: Record<string, string> = {
  USD: "#3b82f6",
  EUR: "#10b981",
  GBP: "#8b5cf6",
  JPY: "#f59e0b",
  CAD: "#ef4444",
  AUD: "#06b6d4",
  CHF: "#ec4899",
  NZD: "#84cc16",
  CNY: "#f97316",
};

type DateRange = "today" | "tomorrow" | "this-week" | "next-week";

function getRange(range: DateRange): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (range) {
    case "today":
      return { from: fmt(today), to: fmt(today) };
    case "tomorrow":
      return { from: fmt(addDays(today, 1)), to: fmt(addDays(today, 1)) };
    case "this-week": {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      return { from: fmt(start), to: fmt(addDays(start, 6)) };
    }
    case "next-week": {
      const start = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
      return { from: fmt(start), to: fmt(addDays(start, 6)) };
    }
  }
}

// ─── Impact Badge ─────────────────────────────────────────────────────────────
function ImpactBadge({ impact }: { impact: "High" | "Medium" | "Low" }) {
  const cls =
    impact === "High"
      ? "impact-high"
      : impact === "Medium"
        ? "impact-medium"
        : "impact-low";

  const dot =
    impact === "High"
      ? "#ef4444"
      : impact === "Medium"
        ? "#f59e0b"
        : "var(--text-tertiary)";

  return (
    <span
      className={`${cls} inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.62rem] font-bold tracking-wide`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: dot }}
      />
      {impact}
    </span>
  );
}

// ─── Data cell ────────────────────────────────────────────────────────────────
function DataCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | null;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
      <span
        className="text-[0.52rem] uppercase tracking-widest font-semibold"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      <span
        className="font-mono font-semibold text-[0.78rem]"
        style={{
          color: value
            ? accent
              ? "var(--accent-primary)"
              : "var(--text-primary)"
            : "var(--text-tertiary)",
        }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Event Row ────────────────────────────────────────────────────────────────
function EventRow({ event, index }: { event: EconomicEvent; index: number }) {
  const eventTime = new Date(event.time);
  const isUpcoming = eventTime > new Date();
  const isHigh = event.impact === "High";

  return (
    <div
      className="group flex items-center gap-4 px-5 py-3.5 transition-all duration-150 cursor-default"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        background:
          isHigh && isUpcoming
            ? "rgba(224, 82, 90, 0.025)"
            : !isUpcoming
              ? "var(--surface-elevated)"
              : "transparent",
        animationDelay: `${index * 30}ms`,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--surface-hover)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background =
          isHigh && isUpcoming
            ? "rgba(224, 82, 90, 0.025)"
            : !isUpcoming
              ? "var(--surface-elevated)"
              : "transparent")
      }
    >
      {/* High impact accent bar */}
      {isHigh && isUpcoming && (
        <div
          className="absolute left-0 w-0.5 h-8 rounded-r"
          style={{ background: "var(--loss-primary)", opacity: 0.6 }}
        />
      )}

      {/* Time */}
      <div className="w-14 shrink-0 flex flex-col gap-0.5">
        <span
          className="font-mono text-[0.76rem] font-semibold leading-none"
          style={{
            color: isUpcoming ? "var(--text-primary)" : "var(--text-tertiary)",
          }}
        >
          {format(eventTime, "HH:mm")}
        </span>
        <span
          className="text-[0.58rem] font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          {format(eventTime, "MMM d")}
        </span>
      </div>

      {/* Currency badge */}
      <div
        className="w-12 shrink-0 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-[var(--radius-default)] transition-all"
        style={{
          background: isUpcoming
            ? "var(--accent-soft)"
            : "var(--surface-elevated)",
          border: `1px solid ${isUpcoming ? "var(--border-active)" : "var(--border-default)"}`,
        }}
      >
        <span
          className="font-mono font-black text-[0.7rem] leading-none"
          style={{
            color: CURRENCY_COLOR[event.currency] ?? "var(--accent-primary)",
          }}
        >
          {event.currency}
        </span>
      </div>

      {/* Impact */}
      <div className="w-20 shrink-0">
        <ImpactBadge impact={event.impact} />
      </div>

      {/* Event name */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[0.83rem] font-semibold truncate leading-snug"
          style={{
            color: isUpcoming ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {event.event}
        </p>
        <p
          className="text-[0.63rem] font-medium mt-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          {event.country}
        </p>
      </div>

      {/* Data cells */}
      <div className="flex items-center gap-5 shrink-0">
        <DataCell label="Actual" value={event.actual} accent />
        <DataCell label="Forecast" value={event.forecast} />
        <DataCell label="Previous" value={event.previous} />
      </div>
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="w-14 h-7 rounded shimmer" />
      <div className="w-12 h-10 rounded-[var(--radius-default)] shimmer" />
      <div className="w-20 h-5 rounded-full shimmer" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-2/3 rounded shimmer" />
        <div className="h-2.5 w-1/3 rounded shimmer" />
      </div>
      <div className="flex gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-12 h-7 rounded shimmer" />
        ))}
      </div>
    </div>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────
function StatChip({
  dot,
  count,
  label,
}: {
  dot: string;
  count: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: dot, boxShadow: `0 0 6px ${dot}80` }}
      />
      <span
        className="font-mono font-bold text-[0.8rem]"
        style={{ color: "var(--text-primary)" }}
      >
        {count}
      </span>
      <span
        className="text-[0.68rem] font-medium"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NewsPage() {
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [impact, setImpact] = useState<"all" | "High" | "Medium" | "Low">(
    "all",
  );
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAI, setShowAI] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getRange(dateRange);
      const params = new URLSearchParams({
        from,
        to,
        currencies: selectedCurrencies.join(","),
        impact,
      });
      const res = await fetch(`/api/news/economic-calendar?${params}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setUsingMock(data.usingMock ?? false);
      setLastUpdated(new Date());
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCurrencies, impact, dateRange]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const toggleCurrency = (code: string) => {
    setSelectedCurrencies((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const highCount = events.filter((e) => e.impact === "High").length;
  const mediumCount = events.filter((e) => e.impact === "Medium").length;
  const lowCount = events.filter((e) => e.impact === "Low").length;

  const DATE_RANGE_OPTS: { key: DateRange; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "tomorrow", label: "Tomorrow" },
    { key: "this-week", label: "This Week" },
    { key: "next-week", label: "Next Week" },
  ];

  const IMPACT_OPTS = [
    { key: "all" as const, label: "All", dot: "var(--text-tertiary)" },
    { key: "High" as const, label: "High", dot: "#ef4444" },
    { key: "Medium" as const, label: "Medium", dot: "#f59e0b" },
    { key: "Low" as const, label: "Low", dot: "var(--text-tertiary)" },
  ];

  return (
    <div
      className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden page-enter"
      style={{ background: "var(--app-bg)" }}
    >
      {/* ── Premium Page Header ── */}
      <div
        className="gradient-mesh-header px-6 pt-5 pb-4 shrink-0"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {/* Title Row */}
        <div className="flex items-start justify-between mb-5 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-default)]"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                  boxShadow: "0 4px 14px var(--accent-glow)",
                }}
              >
                <Zap size={15} color="#fff" />
              </div>
              <h1
                className="text-gradient"
                style={{
                  fontWeight: 800,
                  fontSize: "1.5rem",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                Economic Calendar
              </h1>
            </div>
            <div className="flex items-center gap-3 pl-10">
              <p
                className="text-[0.72rem] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                {lastUpdated
                  ? `Updated at ${format(lastUpdated, "HH:mm")}`
                  : "Fetching events..."}
              </p>
              {usingMock && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold"
                  style={{
                    background: "var(--warning-bg)",
                    color: "var(--warning-primary)",
                    border: "1px solid color-mix(in srgb, var(--warning-primary) 30%, transparent)",
                  }}
                >
                  <AlertTriangle size={9} />
                  Demo data · add FINNHUB_API_KEY
                </span>
              )}
            </div>
          </div>

          {/* Header Actions + Stats */}
          <div className="flex items-center gap-3">
            {/* Stat chips */}
            <div
              className="hidden md:flex items-center divide-x rounded-[var(--radius-lg)] px-4 py-2.5"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div className="pr-4">
                <StatChip dot="#ef4444" count={highCount} label="High" />
              </div>
              <div className="px-4">
                <StatChip dot="#f59e0b" count={mediumCount} label="Medium" />
              </div>
              <div className="pl-4">
                <StatChip
                  dot="var(--text-tertiary)"
                  count={lowCount}
                  label="Low"
                />
              </div>
              <div className="pl-4 flex items-center gap-1.5">
                <TrendingUp
                  size={12}
                  style={{ color: "var(--accent-primary)" }}
                />
                <span
                  className="font-mono font-bold text-[0.8rem]"
                  style={{ color: "var(--text-primary)" }}
                >
                  {events.length}
                </span>
                <span
                  className="text-[0.68rem] font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Total
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={fetchEvents}
              disabled={loading}
              variant="outline"
              className="h-auto gap-1.5 rounded-[var(--radius-default)] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3.5 py-2 text-[0.73rem] font-semibold text-[var(--text-secondary)] shadow-none"
              style={{
                background: "var(--surface-elevated)",
              }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>

            <Button
              type="button"
              onClick={() => setShowAI((v) => !v)}
              className="h-auto gap-1.5 rounded-[var(--radius-default)] border px-3.5 py-2 text-[0.73rem] font-semibold"
              style={{
                background: showAI
                  ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
                  : "var(--surface-elevated)",
                borderColor: showAI ? "transparent" : "var(--border-default)",
                color: showAI ? "#fff" : "var(--text-secondary)",
                boxShadow: showAI ? "0 4px 16px var(--accent-glow)" : "none",
              }}
            >
              <Sparkles size={13} />
              AI Agent
            </Button>
          </div>
        </div>

        {/* Date range tabs */}
        <div className="flex items-center gap-1.5 mb-3 relative z-10">
          <div
            className="flex items-center gap-1 p-1 rounded-[var(--radius-md)]"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-default)",
            }}
          >
            {DATE_RANGE_OPTS.map((opt) => (
              <Button
                key={opt.key}
                type="button"
                onClick={() => setDateRange(opt.key)}
                variant="ghost"
                size="sm"
                className="h-auto rounded-[var(--radius-sm)] px-3 py-1 text-[0.71rem] font-semibold"
                style={{
                  background:
                    dateRange === opt.key ? "var(--surface)" : "transparent",
                  color:
                    dateRange === opt.key
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                  boxShadow:
                    dateRange === opt.key ? "var(--shadow-sm)" : "none",
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div
            style={{
              width: "1px",
              height: "20px",
              background: "var(--border-default)",
            }}
          />

          {/* Impact filter pills */}
          <div className="flex items-center gap-1">
            {IMPACT_OPTS.map((opt) => {
              const isActive = impact === opt.key;
              return (
                <Button
                  key={opt.key}
                  type="button"
                  onClick={() => setImpact(opt.key)}
                  variant="ghost"
                  size="sm"
                  className="h-auto gap-1.5 rounded-full px-2.5 py-1 text-[0.69rem] font-semibold"
                  style={{
                    background: isActive ? "var(--surface)" : "transparent",
                    color: isActive
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    border: `1px solid ${isActive ? "var(--border-active)" : "transparent"}`,
                    boxShadow: isActive ? "var(--shadow-sm)" : "none",
                  }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: opt.dot }}
                    />
                    {opt.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Currency filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap relative z-10">
          <span
            className="text-[0.63rem] font-semibold uppercase tracking-wider mr-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Currencies
          </span>
          {CURRENCIES.map((currency) => {
            const isSelected = selectedCurrencies.includes(currency.code);
            return (
              <Button
                key={currency.code}
                type="button"
                onClick={() => toggleCurrency(currency.code)}
                variant="ghost"
                size="sm"
                className={`h-auto gap-1.5 rounded-full px-2.5 py-1 text-[0.69rem] font-semibold border ${isSelected ? "currency-chip-active" : ""}`}
                style={
                  !isSelected
                    ? {
                        background: "var(--surface-elevated)",
                        borderColor: "var(--border-default)",
                        color: "var(--text-secondary)",
                      }
                    : undefined
                }
              >
                <span>{currency.flag}</span>
                <span>{currency.code}</span>
              </Button>
            );
          })}
          {selectedCurrencies.length > 0 && (
            <Button
              type="button"
              onClick={() => setSelectedCurrencies([])}
              variant="ghost"
              size="sm"
              className="ml-1 h-auto px-0 py-0 text-[0.67rem] font-semibold text-[var(--text-tertiary)] hover:bg-transparent hover:opacity-70"
              style={{ color: "var(--text-tertiary)" }}
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* ── Body: Events + optional AI panel ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Events List */}
        <div className="flex-1 overflow-y-auto">
          {/* Sticky column header */}
          <div
            className="sticky top-0 flex items-center gap-4 px-5 py-2.5 z-10"
            style={{
              background: "var(--surface-elevated)",
              borderBottom: "1px solid var(--border-default)",
              backdropFilter: "blur(8px)",
            }}
          >
            {[
              { w: "w-14", label: "Time" },
              { w: "w-12", label: "CCY" },
              { w: "w-20", label: "Impact" },
              { w: "flex-1", label: "Event" },
            ].map((col) => (
              <div
                key={col.label}
                className={`${col.w} shrink-0 text-[0.58rem] uppercase tracking-widest font-bold`}
                style={{ color: "var(--text-tertiary)" }}
              >
                {col.label}
              </div>
            ))}
            <div
              className="flex gap-5 shrink-0 text-[0.58rem] uppercase tracking-widest font-bold"
              style={{ color: "var(--text-tertiary)" }}
            >
              <div className="w-14 text-center">Actual</div>
              <div className="w-14 text-center">Forecast</div>
              <div className="w-14 text-center">Previous</div>
            </div>
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-28 gap-5">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-soft), var(--surface))",
                  border: "1px solid var(--border-active)",
                  boxShadow: "0 8px 32px var(--accent-glow)",
                }}
              >
                <Clock size={26} style={{ color: "var(--accent-primary)" }} />
              </div>
              <div className="text-center">
                <p
                  className="font-semibold mb-1.5"
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-primary)",
                  }}
                >
                  No events found
                </p>
                <p
                  className="text-[0.76rem] font-medium max-w-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Adjust your currency filters or choose a different date range
                </p>
              </div>
            </div>
          )}

          {/* Events */}
          {!loading &&
            events.map((event, i) => (
              <EventRow key={event.id} event={event} index={i} />
            ))}
        </div>

        {/* AI Agent Panel */}
        {showAI && (
          <NewsAIAgent events={events} onClose={() => setShowAI(false)} />
        )}
      </div>
    </div>
  );
}
