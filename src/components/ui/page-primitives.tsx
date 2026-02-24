import { cn } from "@/lib/utils";

// ─── Interfaces ──────────────────────────────────────────────────────────────

type Tone = "default" | "profit" | "loss";

interface AppPageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

interface AppPanelProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

interface SectionHeaderProps {
  /** Tiny all-caps label above the title — e.g. "Risk Intelligence" */
  eyebrow?: string;
  /** Main section title — rendered with headline-md */
  title: string;
  /** Optional one-line description below the title */
  subtitle?: string;
  /** Optional trailing action slot (buttons, tabs, etc.) */
  action?: React.ReactNode;
  className?: string;
}

interface PanelTitleProps {
  /** Panel-level heading — rendered with headline-md */
  title: string;
  /** One-line description below the title */
  subtitle: string;
  className?: string;
}

interface AppMetricCardProps {
  label: string;
  value: string;
  hint?: string;
  change?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}

export function AppPageHeader({
  title,
  eyebrow,
  description,
  actions,
  icon,
  className,
}: AppPageHeaderProps) {
  return (
    <section
      className={cn(
        "gradient-mesh-header flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
        "px-6 pt-5 pb-4 rounded-[var(--radius-xl)] relative overflow-hidden",
        className,
      )}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="relative z-10">
        {eyebrow && (
          <p
            className="text-[0.6rem] uppercase tracking-widest font-bold mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-3 mb-1">
          {icon && (
            <div
              className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-default)] shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                boxShadow: "0 4px 14px var(--accent-glow)",
              }}
            >
              {icon}
            </div>
          )}
          <h1
            className="text-gradient"
            style={{
              fontWeight: 800,
              fontSize: "1.45rem",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
        </div>
        {description && (
          <p
            className="mt-1.5 text-[0.76rem] font-medium max-w-xl leading-relaxed"
            style={{
              color: "var(--text-tertiary)",
              paddingLeft: icon ? "3rem" : "0",
            }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 relative z-10 shrink-0">
          {actions}
        </div>
      )}
    </section>
  );
}

export function AppPanel({ children, className, id }: AppPanelProps) {
  return (
    <section
      id={id}
      className={cn("glow-card p-5", className)}
      style={{ background: "var(--surface)" }}
    >
      {children}
    </section>
  );
}

/**
 * Full-width section divider with an eyebrow label and a main title.
 * Use this between major page sections (like Analytics does).
 *
 * @example
 * <SectionHeader eyebrow="Risk Intelligence" title="Risk-Adjusted Performance" />
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn("mb-5 flex items-start justify-between gap-4", className)}
    >
      <div>
        {eyebrow && (
          <p
            className="text-[0.6rem] uppercase tracking-widest font-bold mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            {eyebrow}
          </p>
        )}
        <h2 className="headline-md">{title}</h2>
        {subtitle && (
          <p
            className="text-label mt-1"
            style={{
              textTransform: "none",
              letterSpacing: "0",
              color: "var(--text-secondary)",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Title + one-line subtitle used at the top of every AppPanel.
 * Replaces the inconsistent mix of raw <h3> and text blobs across pages.
 *
 * @example
 * <PanelTitle title="Equity Curve" subtitle="Cumulative account balance over time" />
 */
export function PanelTitle({ title, subtitle, className }: PanelTitleProps) {
  return (
    <div className={cn("mb-4", className)}>
      <h3 className="headline-md mb-0.5">{title}</h3>
      <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        {subtitle}
      </p>
    </div>
  );
}

export function AppMetricCard({
  label,
  value,
  hint,
  change,
  tone = "default",
  icon,
  className,
}: AppMetricCardProps) {
  const toneColor =
    tone === "profit"
      ? "var(--profit-primary)"
      : tone === "loss"
        ? "var(--loss-primary)"
        : "var(--text-primary)";

  const isPositive = change?.startsWith("+");
  const isNegative = change?.startsWith("-");

  return (
    <article className={cn("stat-card-premium p-4 card-enter", className)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className="text-[0.6rem] uppercase tracking-widest font-bold"
          style={{ color: "var(--text-tertiary)" }}
        >
          {label}
        </span>
        {icon && (
          <div
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]"
            style={{ background: "var(--accent-soft)" }}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="stat-large mb-1 counter-pop" style={{ color: toneColor }}>
        {value}
      </p>
      <div className="flex items-center justify-between gap-2">
        {hint && (
          <p
            className="text-[0.67rem] font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            {hint}
          </p>
        )}
        {change && (
          <span
            className="text-[0.64rem] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: isPositive
                ? "var(--profit-bg)"
                : isNegative
                  ? "var(--loss-bg)"
                  : "var(--surface-elevated)",
              color: isPositive
                ? "var(--profit-primary)"
                : isNegative
                  ? "var(--loss-primary)"
                  : "var(--text-tertiary)",
            }}
          >
            {change}
          </span>
        )}
      </div>
    </article>
  );
}
