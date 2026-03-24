"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type InsetTone = "default" | "warning" | "profit" | "loss" | "accent";

interface InsetPanelProps {
  children: ReactNode;
  className?: string;
  tone?: InsetTone;
  style?: CSSProperties;
  paddingClassName?: string;
}

interface ListItemRowProps {
  leading: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

interface WidgetEmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

function getInsetToneStyles(tone: InsetTone) {
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

  if (tone === "accent") {
    return {
      background: "var(--accent-soft)",
      borderColor: "var(--accent-muted)",
    };
  }

  return {
    background: "var(--surface-elevated)",
    borderColor: "var(--border-subtle)",
  };
}

export function InsetPanel({
  children,
  className,
  tone = "default",
  style,
  paddingClassName = "px-4 py-4",
}: InsetPanelProps) {
  const toneStyles = getInsetToneStyles(tone);

  return (
    <div
      className={cn("rounded-[var(--radius-lg)] border", paddingClassName, className)}
      style={{
        background: toneStyles.background,
        borderColor: toneStyles.borderColor,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ListItemRow({
  leading,
  trailing,
  className,
}: ListItemRowProps) {
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

export function WidgetEmptyState({
  title,
  description,
  action,
  icon,
  className,
}: WidgetEmptyStateProps) {
  return (
    <InsetPanel className={cn("py-8 text-center", className)}>
      {icon ? (
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent-soft)", color: "var(--accent-primary)" }}
        >
          {icon}
        </div>
      ) : null}
      <p style={{ color: "var(--text-secondary)", fontSize: "0.83rem" }}>
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
    </InsetPanel>
  );
}
