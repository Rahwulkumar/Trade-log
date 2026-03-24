import { cn } from "@/lib/utils";

// ─── Interfaces ──────────────────────────────────────────────────────────────

type Tone = "default" | "profit" | "loss" | "warning" | "accent";

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
  helper?: string;
  labelAction?: React.ReactNode;
  change?: string;
  changeLabel?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
  size?: "hero" | "compact";
  shell?: "surface" | "elevated";
  monoValue?: boolean;
  minHeight?: number;
}

interface AppPanelEmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  minHeight?: number;
}

interface AppStatListProps {
  items: Array<{
    label: string;
    value: string;
    sub?: string;
    tone?: Tone;
  }>;
  className?: string;
}

function getToneColor(tone: Tone) {
  if (tone === "profit") return "var(--profit-primary)";
  if (tone === "loss") return "var(--loss-primary)";
  if (tone === "warning") return "var(--warning-primary)";
  if (tone === "accent") return "var(--accent-primary)";
  return "var(--text-primary)";
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
              lineHeight: 1.24,
              paddingBottom: "0.1em",
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
  helper,
  labelAction,
  change,
  changeLabel,
  tone = "default",
  icon,
  className,
  align = "left",
  size = "compact",
  shell = "elevated",
  monoValue = size === "compact",
  minHeight,
}: AppMetricCardProps) {
  const toneColor = getToneColor(tone);

  const isPositive = change?.startsWith("+");
  const isNegative = change?.startsWith("-");

  const isHero = size === "hero";

  return (
    <article
      className={cn(
        "flex h-full flex-col justify-between",
        align === "center" ? "text-center" : "text-left",
        shell === "surface"
          ? "surface p-5"
          : "rounded-[var(--radius-lg)] border px-4 py-4",
        className,
      )}
      style={{
        background:
          shell === "surface" ? "var(--surface)" : "var(--surface-elevated)",
        borderColor:
          shell === "surface" ? undefined : "var(--border-subtle)",
        minHeight: minHeight ?? (isHero ? 188 : undefined),
      }}
    >
      <div className={cn(isHero ? "space-y-3" : "space-y-2.5")}>
        <div
          className={cn(
            "flex gap-2",
            align === "center" && !labelAction
              ? "justify-center"
              : "items-start justify-between",
          )}
        >
          <span className="text-label">{label}</span>
          <div className="flex shrink-0 items-center gap-2">
            {labelAction ? <span>{labelAction}</span> : null}
            {icon ? <span>{icon}</span> : null}
          </div>
        </div>

        <p
          className={cn(
            monoValue && "mono",
            isHero ? "stat-large" : "text-[1rem] font-semibold",
          )}
          style={{
            color: toneColor,
            lineHeight: isHero ? undefined : 1.2,
          }}
        >
          {value}
        </p>

        {helper ? (
          <p
            style={{
              fontSize: isHero ? "0.74rem" : "0.7rem",
              color: "var(--text-tertiary)",
              lineHeight: 1.55,
            }}
          >
            {helper}
          </p>
        ) : null}
      </div>

      {change ? (
        <div
          className={cn(
            "mt-4 flex flex-wrap items-center gap-2",
            align === "center" && "justify-center",
          )}
        >
          <span
            className="rounded-full px-2 py-0.5 text-[0.64rem] font-bold"
            style={{
              background: isPositive
                ? "var(--profit-bg)"
                : isNegative
                  ? "var(--loss-bg)"
                  : "var(--surface)",
              color: isPositive
                ? "var(--profit-primary)"
                : isNegative
                  ? "var(--loss-primary)"
                  : "var(--text-tertiary)",
            }}
          >
            {change}
          </span>
          {changeLabel ? (
            <span
              style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}
            >
              {changeLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function AppPanelEmptyState({
  title,
  description,
  action,
  className,
  minHeight = 220,
}: AppPanelEmptyStateProps) {
  return (
    <AppPanel className={cn("flex items-center justify-center", className)}>
      <div
        className="max-w-sm text-center"
        style={{ minHeight, display: "flex", flexDirection: "column", justifyContent: "center" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </AppPanel>
  );
}

export function AppStatList({ items, className }: AppStatListProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start justify-between py-2.5"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {item.label}
          </span>
          <div className="text-right">
            <p
              className="mono text-sm font-semibold"
              style={{ color: getToneColor(item.tone ?? "default") }}
            >
              {item.value}
            </p>
            {item.sub ? (
              <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                {item.sub}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
