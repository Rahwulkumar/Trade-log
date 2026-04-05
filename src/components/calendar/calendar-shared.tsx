"use client";

import { cn } from "@/lib/utils";

type CalendarMetricTone = "default" | "profit" | "loss" | "warning";
type CalendarMetricVariant = "inline" | "pill";
type CalendarPnlPrecision = "adaptive" | "fixed";

function getMetricColor(tone: CalendarMetricTone) {
  if (tone === "profit") return "var(--profit-primary)";
  if (tone === "loss") return "var(--loss-primary)";
  if (tone === "warning") return "var(--warning-primary)";
  return "var(--text-primary)";
}

export function formatSignedPnl(
  value: number,
  precision: CalendarPnlPrecision = "adaptive",
) {
  const abs = Math.abs(value);
  const digits = precision === "fixed" ? 2 : abs >= 100 ? 0 : 2;
  return `${value >= 0 ? "+" : "-"}$${abs.toFixed(digits)}`;
}

export function CalendarMetric({
  label,
  value,
  tone = "default",
  variant = "inline",
  className,
}: {
  label: string;
  value: string;
  tone?: CalendarMetricTone;
  variant?: CalendarMetricVariant;
  className?: string;
}) {
  if (variant === "pill") {
    return (
      <div
        className={cn("rounded-full border px-2.5 py-1", className)}
        style={{
          background: "var(--surface-elevated)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <span className="text-[0.62rem] text-[var(--text-tertiary)]">{label}</span>
        <span
          className="ml-1.5 text-[0.72rem] font-semibold"
          style={{ color: getMetricColor(tone) }}
        >
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <span className="text-[0.64rem] text-[var(--text-tertiary)]">{label}</span>
      <span
        className="text-[0.74rem] font-semibold"
        style={{ color: getMetricColor(tone) }}
      >
        {value}
      </span>
    </div>
  );
}
