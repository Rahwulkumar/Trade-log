import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  AppPanel,
  AppStatList,
  PanelTitle,
} from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";

interface ReportGridProps {
  children: ReactNode;
  minWidthClassName?: string;
  className?: string;
}

interface ReportGridHeaderProps {
  columns: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface ReportGridRowProps {
  columns: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  paddingClassName?: string;
}

type ReportTone = "performance" | "strategy" | "risk";

interface ReportTypeBadgeProps {
  label: string;
  tone: ReportTone;
  className?: string;
}

interface ReportCatalogCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  category: string;
  tone: ReportTone;
  details: Array<{
    label: string;
    value: string;
    tone?: "default" | "profit" | "loss" | "warning" | "accent";
    sub?: string;
  }>;
  action?: ReactNode;
  className?: string;
}

export type ReportInsightTone =
  | "default"
  | "profit"
  | "loss"
  | "warning"
  | "accent";

interface ReportNarrativeTextProps {
  text: string;
  className?: string;
}

interface ReportBulletListProps {
  items: string[];
  tone?: ReportInsightTone;
  emptyLabel?: string;
  ordered?: boolean;
  className?: string;
}

interface ReportSectionPanelProps {
  icon?: ReactNode;
  title: string;
  narrative?: string;
  items?: string[];
  itemTone?: ReportInsightTone;
  itemLabel?: string;
  className?: string;
}

interface ReportInsightColumnsProps {
  left: {
    title: string;
    items: string[];
    tone: ReportInsightTone;
    emptyLabel?: string;
  };
  right: {
    title: string;
    items: string[];
    tone: ReportInsightTone;
    emptyLabel?: string;
  };
  className?: string;
}

interface ReportCalloutProps {
  label: string;
  body: string;
  tone?: ReportInsightTone;
  icon?: ReactNode;
  className?: string;
}

interface ReportActionPlanProps {
  quickWins: string[];
  longerTermFocus: string[];
  correctiveActions: string[];
  className?: string;
}

function getReportToneStyles(tone: ReportTone) {
  if (tone === "strategy") {
    return {
      iconBackground: "var(--surface-elevated)",
      iconBorder: "var(--border-default)",
      iconColor: "var(--accent-secondary)",
      badgeBackground: "var(--surface-elevated)",
      badgeBorder: "var(--border-default)",
      badgeColor: "var(--accent-secondary)",
    };
  }

  if (tone === "risk") {
    return {
      iconBackground: "var(--warning-bg)",
      iconBorder:
        "color-mix(in srgb, var(--warning-primary) 22%, transparent)",
      iconColor: "var(--warning-primary)",
      badgeBackground: "var(--warning-bg)",
      badgeBorder:
        "color-mix(in srgb, var(--warning-primary) 22%, transparent)",
      badgeColor: "var(--warning-primary)",
    };
  }

  return {
    iconBackground: "var(--accent-soft)",
    iconBorder: "var(--accent-muted)",
    iconColor: "var(--accent-primary)",
    badgeBackground: "var(--accent-soft)",
    badgeBorder: "var(--accent-muted)",
    badgeColor: "var(--accent-primary)",
  };
}

function getInsightColor(tone: ReportInsightTone) {
  if (tone === "profit") return "var(--profit-primary)";
  if (tone === "loss") return "var(--loss-primary)";
  if (tone === "warning") return "var(--warning-primary)";
  if (tone === "accent") return "var(--accent-primary)";
  return "var(--text-secondary)";
}

function getInsightDotColor(tone: ReportInsightTone) {
  if (tone === "profit") return "var(--profit-primary)";
  if (tone === "loss") return "var(--loss-primary)";
  if (tone === "warning") return "var(--warning-primary)";
  if (tone === "accent") return "var(--accent-primary)";
  return "var(--border-default)";
}

function splitNarrativeParagraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function ReportGrid({
  children,
  minWidthClassName = "min-w-[640px]",
  className,
}: ReportGridProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className={cn("space-y-2", minWidthClassName)}>{children}</div>
    </div>
  );
}

export function ReportGridHeader({
  columns,
  children,
  className,
  style,
}: ReportGridHeaderProps) {
  return (
    <div
      className={cn(
        "grid px-3 pb-2 text-[9px] font-bold uppercase tracking-wide",
        className,
      )}
      style={{
        gridTemplateColumns: columns,
        color: "var(--text-tertiary)",
        borderBottom: "1px solid var(--border-subtle)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ReportGridRow({
  columns,
  children,
  className,
  style,
  paddingClassName = "px-3 py-2.5",
}: ReportGridRowProps) {
  return (
    <InsetPanel
      className={cn("grid items-center gap-3", className)}
      paddingClassName={paddingClassName}
      style={{
        gridTemplateColumns: columns,
        ...style,
      }}
    >
      {children}
    </InsetPanel>
  );
}

export function ReportTypeBadge({
  label,
  tone,
  className,
}: ReportTypeBadgeProps) {
  const styles = getReportToneStyles(tone);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em]",
        className,
      )}
      style={{
        background: styles.badgeBackground,
        borderColor: styles.badgeBorder,
        color: styles.badgeColor,
      }}
    >
      {label}
    </span>
  );
}

export function ReportCatalogCard({
  icon,
  title,
  description,
  category,
  tone,
  details,
  action,
  className,
}: ReportCatalogCardProps) {
  const styles = getReportToneStyles(tone);

  return (
    <AppPanel className={cn("flex h-full flex-col p-5", className)}>
      <div className="mb-4 flex items-start gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border"
          style={{
            background: styles.iconBackground,
            borderColor: styles.iconBorder,
            color: styles.iconColor,
          }}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <PanelTitle title={title} subtitle={description} className="mb-0" />
          <ReportTypeBadge label={category} tone={tone} className="mt-2" />
        </div>
      </div>

      <InsetPanel className="mb-4" paddingClassName="px-4 py-2">
        <AppStatList items={details} />
      </InsetPanel>

      {action ? <div className="mt-auto">{action}</div> : null}
    </AppPanel>
  );
}

export function ReportNarrativeText({
  text,
  className,
}: ReportNarrativeTextProps) {
  const paragraphs = splitNarrativeParagraphs(text);

  return (
    <div className={cn("space-y-4", className)}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${paragraph}-${index}`}
          className="text-sm leading-7"
          style={{ color: "var(--text-secondary)" }}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function ReportBulletList({
  items,
  tone = "default",
  emptyLabel = "No signals detected.",
  ordered = false,
  className,
}: ReportBulletListProps) {
  if (items.length === 0) {
    return (
      <p className={cn("text-sm", className)} style={{ color: "var(--text-tertiary)" }}>
        {emptyLabel}
      </p>
    );
  }

  if (ordered) {
    return (
      <ol className={cn("space-y-3", className)}>
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-start gap-3 text-sm leading-6"
          >
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none"
              style={{
                background:
                  tone === "loss"
                    ? "var(--loss-bg)"
                    : tone === "warning"
                      ? "var(--warning-bg)"
                      : "var(--accent-soft)",
                color: getInsightColor(tone),
                fontFamily: "var(--font-jb-mono)",
                marginTop: 3,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span style={{ color: "var(--text-secondary)" }}>{item}</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex items-start gap-2.5 text-sm leading-6"
        >
          <span
            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: getInsightDotColor(tone) }}
          />
          <span style={{ color: getInsightColor(tone) }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportSectionPanel({
  icon,
  title,
  narrative,
  items,
  itemTone = "default",
  itemLabel,
  className,
}: ReportSectionPanelProps) {
  return (
    <AppPanel className={className}>
      <div className="mb-4 flex items-center gap-2.5">
        {icon ? <span style={{ color: "var(--accent-primary)" }}>{icon}</span> : null}
        <p className="headline-md">{title}</p>
      </div>

      {narrative ? <ReportNarrativeText text={narrative} /> : null}

      {items && items.length > 0 ? (
        <div className="mt-5">
          {itemLabel ? (
            <p className="text-label mb-3" style={{ color: "var(--text-tertiary)" }}>
              {itemLabel}
            </p>
          ) : null}
          <ReportBulletList items={items} tone={itemTone} />
        </div>
      ) : null}
    </AppPanel>
  );
}

export function ReportInsightColumns({
  left,
  right,
  className,
}: ReportInsightColumnsProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <InsetPanel tone={left.tone}>
        <p className="text-label mb-3" style={{ color: getInsightColor(left.tone) }}>
          {left.title}
        </p>
        <ReportBulletList
          items={left.items}
          tone={left.tone}
          emptyLabel={left.emptyLabel}
        />
      </InsetPanel>

      <InsetPanel tone={right.tone}>
        <p className="text-label mb-3" style={{ color: getInsightColor(right.tone) }}>
          {right.title}
        </p>
        <ReportBulletList
          items={right.items}
          tone={right.tone}
          emptyLabel={right.emptyLabel}
        />
      </InsetPanel>
    </div>
  );
}

export function ReportCallout({
  label,
  body,
  tone = "accent",
  icon,
  className,
}: ReportCalloutProps) {
  return (
    <InsetPanel tone={tone} className={cn("flex items-start gap-3", className)}>
      {icon ? <span className="mt-0.5 shrink-0" style={{ color: getInsightColor(tone) }}>{icon}</span> : null}
      <div>
        <p className="text-label mb-2" style={{ color: getInsightColor(tone) }}>
          {label}
        </p>
        <p className="text-sm leading-7" style={{ color: "var(--text-primary)" }}>
          {body}
        </p>
      </div>
    </InsetPanel>
  );
}

export function ReportActionPlan({
  quickWins,
  longerTermFocus,
  correctiveActions,
  className,
}: ReportActionPlanProps) {
  return (
    <AppPanel className={className}>
      <PanelTitle
        title="Action Plan"
        subtitle="Short-term adjustments and longer-term focus areas derived from the AI review."
      />

      <div className="space-y-5">
        {quickWins.length > 0 ? (
          <div>
            <p className="text-label mb-3" style={{ color: "var(--accent-primary)" }}>
              Quick Wins
            </p>
            <ReportBulletList items={quickWins} tone="accent" />
          </div>
        ) : null}

        {longerTermFocus.length > 0 ? (
          <div>
            <div
              className="my-4"
              style={{ height: 1, background: "var(--border-subtle)" }}
            />
            <p className="text-label mb-3" style={{ color: "var(--warning-primary)" }}>
              Longer-Term Focus
            </p>
            <ReportBulletList items={longerTermFocus} tone="warning" />
          </div>
        ) : null}

        {correctiveActions.length > 0 ? (
          <div>
            <div
              className="my-4"
              style={{ height: 1, background: "var(--border-subtle)" }}
            />
            <p className="text-label mb-3" style={{ color: "var(--loss-primary)" }}>
              Corrective Actions
            </p>
            <ReportBulletList
              items={correctiveActions}
              tone="loss"
              ordered
            />
          </div>
        ) : null}
      </div>
    </AppPanel>
  );
}
