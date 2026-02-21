/**
 * Empty State Component - Professional Trading Platform
 * Following rule_ui.md: Unique empty states
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4",
        "bg-bg-secondary rounded-[var(--radius-lg)] border border-border-default",
        className,
      )}
    >
      {/* Icon */}
      {icon ? (
        <div className="mb-4 text-text-tertiary">{icon}</div>
      ) : (
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          className="text-text-tertiary mb-4"
        >
          <rect
            x="12"
            y="12"
            width="40"
            height="40"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}

      {/* Title */}
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-text-secondary text-center max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Specialized empty states
export function NoTradesEmpty({ onAddTrade }: { onAddTrade?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect
            x="12"
            y="20"
            width="8"
            height="24"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="24"
            y="16"
            width="8"
            height="28"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="36"
            y="22"
            width="8"
            height="22"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="48"
            y="18"
            width="8"
            height="26"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      }
      title="No trades yet"
      description="Start logging your trades to track performance and improve your strategy."
      action={
        onAddTrade
          ? {
              label: "Log First Trade",
              onClick: onAddTrade,
            }
          : undefined
      }
    />
  );
}

export function NoDataEmpty() {
  return (
    <EmptyState
      title="No data available"
      description="There's no data to display at the moment. Try adjusting your filters or date range."
    />
  );
}
