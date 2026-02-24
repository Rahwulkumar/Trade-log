"use client";

import { TooltipProps } from "recharts";

interface ChartTooltipProps extends TooltipProps<number, string> {
  showSign?: boolean;
}

export function ChartTooltip({ active, payload, label, showSign }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[var(--radius-sm)] border px-3 py-2 text-xs shadow-md" style={{ background: "var(--surface-elevated)", borderColor: "var(--border-default)" }}>
      {label && (
        <div className="mb-1 font-medium" style={{ color: "var(--text-secondary)" }}>
          {label}
        </div>
      )}
      {payload.map((entry, i) => {
        const value = entry.value ?? 0;
        const formatted = showSign
          ? `${value >= 0 ? "+" : ""}$${Number(value).toFixed(2)}`
          : `$${Number(value).toFixed(2)}`;
        return (
          <div key={i} style={{ color: typeof entry.color === "string" ? entry.color : "var(--text-primary)" }}>
            {formatted}
          </div>
        );
      })}
    </div>
  );
}
