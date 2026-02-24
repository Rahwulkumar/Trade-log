import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface JournalCardProps {
  children: ReactNode;
  className?: string; // Allow overrides if absolutely necessary, but encourage defaults
}

export function JournalCard({ children, className }: JournalCardProps) {
  return (
    <div
      className={cn("rounded-xl p-6 overflow-hidden", className)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {children}
    </div>
  );
}
