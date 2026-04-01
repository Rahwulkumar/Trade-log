"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/page-primitives";
import { ListItemRow } from "@/components/ui/surface-primitives";
import type { JournalPromotionCandidate } from "@/lib/journal-structure/promotion";

function formatCandidateSources(candidate: JournalPromotionCandidate) {
  const sourceLabel = candidate.sources.join(" + ");
  if (candidate.suggestedPlaybookName) {
    return `${sourceLabel} • mostly used with ${candidate.suggestedPlaybookName}`;
  }
  return sourceLabel;
}

export function LibraryPromotionPanel({
  title,
  subtitle,
  items,
  actionLabel,
  onPromote,
}: {
  title: string;
  subtitle: string;
  items: JournalPromotionCandidate[];
  actionLabel: string;
  onPromote: (candidate: JournalPromotionCandidate) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = useMemo(
    () => (expanded ? items : items.slice(0, 4)),
    [expanded, items],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border bg-[var(--surface-elevated)] px-4 py-4">
      <SectionHeader
        className="mb-0"
        title={title}
        subtitle={subtitle}
        actions={
          items.length > 4 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? "Show less" : `Show all ${items.length}`}
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-2">
        {visibleItems.map((candidate) => (
          <ListItemRow
            key={candidate.label}
            leading={
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {candidate.label}
                  </p>
                  <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                    used on {candidate.count}{" "}
                    {candidate.count === 1 ? "trade" : "trades"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {formatCandidateSources(candidate)}
                </p>
              </div>
            }
            trailing={
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onPromote(candidate)}
              >
                <Sparkles className="h-4 w-4" />
                {actionLabel}
              </Button>
            }
            className="border-none bg-[var(--surface)]"
          />
        ))}
      </div>
    </div>
  );
}
