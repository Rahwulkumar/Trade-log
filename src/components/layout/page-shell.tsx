"use client";

import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("page-root page-sections py-8 fade-in", className)}>
      {children}
    </div>
  );
}
