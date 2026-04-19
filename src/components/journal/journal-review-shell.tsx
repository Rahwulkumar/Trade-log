"use client";

import type { ReactNode } from "react";

import { InsetPanel } from "@/components/ui/surface-primitives";

export function JournalSupportBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <InsetPanel
      className="space-y-3.5"
      paddingClassName="px-3.5 py-3.5 sm:px-4 sm:py-4"
    >
      <div className="space-y-1">
        <p className="text-label">{title}</p>
        {description ? (
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        ) : null}
      </div>
      {children}
    </InsetPanel>
  );
}
