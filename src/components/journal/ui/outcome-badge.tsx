import { cn } from "@/lib/utils";

interface OutcomeBadgeProps {
  outcome: string | null | undefined;
}

export function OutcomeBadge({ outcome }: OutcomeBadgeProps) {
  const isWin = outcome === "WIN";
  const isLoss = outcome === "LOSS";
  const isBE = outcome === "BE";

  const style = isWin
    ? {
        background: "rgba(78,203,6,0.1)",
        color: "var(--profit-primary)",
        borderColor: "rgba(78,203,6,0.2)",
      }
    : isLoss
      ? {
          background: "rgba(255,68,85,0.1)",
          color: "var(--loss-primary)",
          borderColor: "rgba(255,68,85,0.2)",
        }
      : isBE
        ? {
            background: "rgba(240,165,0,0.1)",
            color: "var(--warning-primary)",
            borderColor: "rgba(240,165,0,0.2)",
          }
        : undefined;

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
        !style && "bg-muted text-muted-foreground border-border",
      )}
      style={style}
    >
      {outcome || "OPEN"}
    </span>
  );
}
