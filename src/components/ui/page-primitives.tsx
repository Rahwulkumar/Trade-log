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
  /** Backward-compatible alias for action */
  actions?: React.ReactNode;
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
        "flex flex-col gap-3 rounded-[var(--radius-xl)] border px-4 py-4 sm:px-5",
        "lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p
            className="mb-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {eyebrow}
          </p>
        )}
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border"
              style={{
                background: "var(--surface-elevated)",
                borderColor: "var(--border-subtle)",
                color: "var(--accent-primary)",
              }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.2rem, 1.6vw, 1.5rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.12,
              }}
            >
              {title}
            </h1>
            {description && (
              <p
                className="mt-1 max-w-2xl text-[0.82rem] leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
      className={cn(
        "rounded-[var(--radius-xl)] border p-4 sm:p-5",
        className,
      )}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
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
  actions,
  className,
}: SectionHeaderProps) {
  const resolvedAction = action ?? actions;
  return (
    <div
      className={cn("mb-4 flex items-start justify-between gap-4", className)}
    >
      <div>
        {eyebrow && (
          <p
            className="mb-1 text-[0.66rem] font-semibold uppercase tracking-[0.08em]"
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
      {resolvedAction && <div className="shrink-0">{resolvedAction}</div>}
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
      <p className="text-[12px] leading-5" style={{ color: "var(--text-secondary)" }}>
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
