/**
 * Error State Component - Professional Trading Platform
 * Following rule_ui.md: Unique error states
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onReset?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  onReset,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4",
        "bg-loss-bg rounded-[var(--radius-lg)] border border-loss-primary/30",
        className,
      )}
    >
      {/* Error Icon */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        className="text-loss-primary mb-4"
      >
        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" />
        <path
          d="M32 20V36M32 44H32.02"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* Title */}
      <h3 className="text-lg font-semibold text-loss-primary mb-2">{title}</h3>

      {/* Message */}
      <p className="text-sm text-text-secondary text-center max-w-md mb-6">
        {message}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="destructive">
            Try Again
          </Button>
        )}
        {onReset && (
          <Button onClick={onReset} variant="secondary">
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

// Inline error message
export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-loss-bg rounded-[var(--radius-md)] border border-loss-primary/30">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="text-loss-primary mt-0.5 flex-shrink-0"
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 4V9M8 12H8.01"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-sm text-loss-primary">{message}</p>
    </div>
  );
}
