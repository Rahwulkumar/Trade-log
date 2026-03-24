"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardInsetTone = "default" | "warning" | "profit" | "loss";

interface DashboardInsetPanelProps {
  children: ReactNode;
  className?: string;
  tone?: DashboardInsetTone;
}

interface DashboardListItemProps {
  leading: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

interface DashboardWidgetEmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

function getInsetToneStyles(tone: DashboardInsetTone) {
  if (tone === "warning") {
    return {
      background: "var(--warning-bg)",
      borderColor:
        "color-mix(in srgb, var(--warning-primary) 28%, transparent)",
    };
  }

  if (tone === "profit") {
    return {
      background: "var(--profit-bg)",
      borderColor:
        "color-mix(in srgb, var(--profit-primary) 22%, transparent)",
    };
  }

  if (tone === "loss") {
    return {
      background: "var(--loss-bg)",
      borderColor: "color-mix(in srgb, var(--loss-primary) 22%, transparent)",
    };
  }

  return {
    background: "var(--surface-elevated)",
    borderColor: "var(--border-subtle)",
  };
}

export function DashboardInsetPanel({
  children,
  className,
  tone = "default",
}: DashboardInsetPanelProps) {
  const toneStyles = getInsetToneStyles(tone);

  return (
    <div
      className={cn("rounded-[var(--radius-lg)] border px-4 py-4", className)}
      style={{
        background: toneStyles.background,
        borderColor: toneStyles.borderColor,
      }}
    >
      {children}
    </div>
  );
}

export function DashboardListItem({
  leading,
  trailing,
  className,
}: DashboardListItemProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-md)] border p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      style={{
        background: "var(--surface-elevated)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="min-w-0 flex-1">{leading}</div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

export function DashboardWidgetEmptyState({
  title,
  description,
  action,
  icon,
  className,
}: DashboardWidgetEmptyStateProps) {
  return (
    <DashboardInsetPanel
      className={cn("py-8 text-center", className)}
    >
      {icon ? (
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent-soft)", color: "var(--accent-primary)" }}
        >
          {icon}
        </div>
      ) : null}
      <p
        style={{ color: "var(--text-secondary)", fontSize: "0.83rem" }}
      >
        {title}
      </p>
      <p
        style={{
          color: "var(--text-tertiary)",
          fontSize: "0.72rem",
          marginTop: "0.25rem",
        }}
      >
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </DashboardInsetPanel>
  );
}
