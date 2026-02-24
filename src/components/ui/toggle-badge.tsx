"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToggleBadgeProps {
  selected?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  className?: string;
}

function ToggleBadge({
  selected = false,
  onToggle,
  children,
  className,
}: ToggleBadgeProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all",
        "border select-none cursor-pointer",
        selected
          ? "border-transparent"
          : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-active)]",
        className,
      )}
      style={
        selected
          ? {
              background: "var(--accent-soft)",
              color: "var(--accent-primary)",
              border: "1px solid var(--border-active)",
            }
          : undefined
      }
    >
      {children}
      {selected && (
        <X
          size={10}
          strokeWidth={2.5}
          style={{ color: "var(--accent-primary)", opacity: 0.7 }}
        />
      )}
    </button>
  );
}

export { ToggleBadge };
