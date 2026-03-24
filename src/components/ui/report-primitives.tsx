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
