import { cn } from "@/lib/utils";

interface JournalStepHeaderProps {
  step: number; // 1, 2, 3...
  title: string;
  color?:
    | "primary"
    | "emerald"
    | "indigo"
    | "amber"
    | "purple"
    | "sky"
    | "rose";
  className?: string;
}

const colorMap = {
  primary: "bg-primary",
  emerald: "bg-emerald-500",
  indigo: "bg-indigo-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  sky: "bg-sky-500",
  rose: "bg-rose-500",
};

export function JournalStepHeader({
  step,
  title,
  color = "primary",
  className,
}: JournalStepHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2 mb-2", className)}>
      <div className={cn("w-1 h-4 rounded-full", colorMap[color])} />
      <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {step}. {title}
      </h2>
    </div>
  );
}
