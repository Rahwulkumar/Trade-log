import { cn } from "@/lib/utils";

interface PnLBadgeProps {
  value: string | number | null;
  outcome?: string | null;
  label?: string;
}

export function PnLBadge({ value, outcome, label = "Net P&L" }: PnLBadgeProps) {
  const isWin = outcome === "WIN";

  return (
    <div className="flex flex-col items-end mr-4">
      <span
        className={cn(
          "text-lg font-mono font-medium leading-none",
          isWin ? "text-[var(--profit-primary)]" : "text-[var(--loss-primary)]",
          !outcome && "text-muted-foreground",
        )}
      >
        {value || "---"}
      </span>
      <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mt-1">
        {label}
      </span>
    </div>
  );
}
