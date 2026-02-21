import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface JournalCardProps {
  children: ReactNode;
  className?: string; // Allow overrides if absolutely necessary, but encourage defaults
}

export function JournalCard({ children, className }: JournalCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-6 shadow-sm overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
