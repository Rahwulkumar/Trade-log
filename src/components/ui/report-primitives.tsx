"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

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
