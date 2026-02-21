"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ToggleBadgeProps extends React.ComponentProps<"button"> {
  selected?: boolean;
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  onToggle?: () => void;
}

export function ToggleBadge({
  selected,
  children,
  className,
  onToggle,
  ...props
}: ToggleBadgeProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative inline-flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      <Badge
        variant={selected ? "secondary" : "outline"}
        className={cn(
          "px-3 py-1 cursor-pointer transition-all duration-300",
          selected
            ? "bg-secondary text-foreground border-border shadow-sm hover:bg-secondary/80"
            : "text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground bg-transparent",
        )}
      >
        <span className="flex items-center gap-1.5">
          {children}
          {selected && <Check className="w-3 h-3" />}
        </span>
      </Badge>
    </button>
  );
}
