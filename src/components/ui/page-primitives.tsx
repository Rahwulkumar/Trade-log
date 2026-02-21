import { cn } from "@/lib/utils";

type Tone = "default" | "profit" | "loss";

interface AppPageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

interface AppPanelProps {
  children: React.ReactNode;
  className?: string;
}

interface AppMetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}

export function AppPageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: AppPageHeaderProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow && <p className="text-label mb-1">{eyebrow}</p>}
        <h1 className="headline-lg">{title}</h1>
        {description && (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </section>
  );
}

export function AppPanel({ children, className }: AppPanelProps) {
  return <section className={cn("surface p-6", className)}>{children}</section>;
}

export function AppMetricCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  className,
}: AppMetricCardProps) {
  return (
    <article className={cn("surface-raised p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-label">{label}</span>
        {icon}
      </div>
      <p
        className={cn(
          "stat-large",
          tone === "profit" && "text-[var(--profit-primary)]",
          tone === "loss" && "text-[var(--loss-primary)]",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </article>
  );
}
