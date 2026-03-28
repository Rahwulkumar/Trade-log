/**
 * Loading States - Professional Trading Platform
 * Following rule_ui.md: NO generic spinners or skeleton loaders
 * Unique loading animations and states
 */
import * as React from "react";
import { cn } from "@/lib/utils";

// Unique pulse loader - NOT circular dots
export function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="w-2 h-2 bg-accent-primary rounded-full animate-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <div
        className="w-2 h-2 bg-accent-primary rounded-full animate-pulse"
        style={{ animationDelay: "150ms" }}
      />
      <div
        className="w-2 h-2 bg-accent-primary rounded-full animate-pulse"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

// Unique bar loader - animated bars
export function BarLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-end gap-1 h-8", className)}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-1 bg-accent-primary rounded-full animate-bounce"
          style={{
            animationDelay: `${i * 100}ms`,
            height: `${20 + i * 5}px`,
          }}
        />
      ))}
    </div>
  );
}

// Card skeleton - NOT gray bars
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-6 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-default",
        "animate-pulse",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded-[var(--radius-sm)] bg-bg-tertiary" />
          <div className="h-6 w-1/2 rounded-[var(--radius-sm)] bg-bg-tertiary" />
        </div>
        <div className="h-12 w-12 rounded-[var(--radius-md)] bg-bg-tertiary" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded-[var(--radius-sm)] bg-bg-tertiary" />
        <div className="h-3 w-4/5 rounded-[var(--radius-sm)] bg-bg-tertiary" />
      </div>
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-[var(--radius-md)] bg-bg-secondary px-6 py-4">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-[var(--radius-sm)] bg-bg-tertiary"
          style={{ width: `${100 / columns}%` }}
        />
      ))}
    </div>
  );
}

// Full page loader
export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <BarLoader className="mx-auto" />
        <p className="text-sm text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}

// Spinner - unique design
export function Spinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <svg
      className={cn(
        "animate-spin text-accent-primary",
        sizeClasses[size],
        className,
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export {};
