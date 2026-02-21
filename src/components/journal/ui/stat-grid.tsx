import { cn } from "@/lib/utils";

interface StatItemProps {
  label: string;
  value: string | number | null | undefined;
  valueClassName?: string;
}

export function StatItem({ label, value, valueClassName }: StatItemProps) {
  return (
    <div className="p-3 bg-muted/50 rounded border border-border">
      <span className="text-[9px] uppercase text-muted-foreground/60 block mb-1">
        {label}
      </span>
      <span className={cn("font-mono text-sm text-foreground", valueClassName)}>
        {value ?? "---"}
      </span>
    </div>
  );
}

interface StatGridProps {
  children: React.ReactNode;
  cols?: number;
}

export function StatGrid({ children, cols = 4 }: StatGridProps) {
  return (
    <div
      className="grid gap-4 mb-8"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}
