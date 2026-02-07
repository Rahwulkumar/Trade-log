"use client";

import { cn } from "@/lib/utils";
import type { TooltipProps } from "recharts";

interface ChartTooltipProps extends TooltipProps<number, string> {
  valueFormatter?: (value: number) => string;
  showSign?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => `$${v.toLocaleString()}`,
  showSign = false,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value as number;
  const isPositive = value >= 0;

  return (
    <div className="rounded-lg bg-card border border-border p-3 shadow-xl backdrop-blur-sm">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold",
          isPositive ? "text-green-500" : "text-red-500",
        )}
      >
        {showSign && isPositive ? "+" : ""}
        {valueFormatter(value)}
      </p>
    </div>
  );
}
