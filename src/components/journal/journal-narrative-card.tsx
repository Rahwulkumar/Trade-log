"use client";

import { useCallback, useMemo } from "react";

import { parseJournalBrief, serializeJournalBrief } from "@/domain/journal-brief";
import {
  JournalMetaStrip,
  JournalWritingArea,
  JournalWritingCell,
  JournalWritingDeck,
} from "@/components/journal/journal-writing-primitives";

const NARRATIVE_FIELDS = [
  {
    id: "trigger" as const,
    step: "01",
    title: "Why it was worth taking",
    hint: "The part that made this a real trade idea.",
    placeholder: "London range swept the low, reclaimed, and fit the continuation idea.",
  },
  {
    id: "management" as const,
    step: "02",
    title: "Adds or size changes",
    hint: "Only note this if you added, trimmed, or changed exposure.",
    placeholder: "Added the second position after the reclaim held and New York opened in the same direction.",
  },
  {
    id: "exit" as const,
    step: "03",
    title: "Why you were fully out",
    hint: "The actual exit reason, not a chart replay.",
    placeholder: "Closed when the continuation failed and the invalidation started trading.",
  },
];

export function JournalNarrativeCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const brief = useMemo(() => parseJournalBrief(value), [value]);

  const completedCount = useMemo(
    () =>
      NARRATIVE_FIELDS.filter(({ id }) => brief[id].trim().length > 0).length,
    [brief],
  );

  const updateField = useCallback(
    (field: (typeof NARRATIVE_FIELDS)[number]["id"], nextValue: string) => {
      onChange(
        serializeJournalBrief({
          ...brief,
          [field]: nextValue,
        }),
      );
    },
    [brief, onChange],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-label">Trade brief</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Three short notes. Enough to understand the idea without writing an essay.
          </p>
        </div>
        <span
          className="rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold"
          style={{
            background: "var(--surface-elevated)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          {completedCount}/3 filled
        </span>
      </div>

      <JournalWritingDeck className="grid xl:grid-cols-3">
        {NARRATIVE_FIELDS.map((field, index) => (
          <JournalWritingCell
            key={field.id}
            step={field.step}
            title={field.title}
            hint={field.hint}
            className={
              index < NARRATIVE_FIELDS.length - 1
                ? "border-b xl:border-b-0 xl:border-r"
                : ""
            }
          >
            <JournalWritingArea
              value={brief[field.id]}
              onChange={(nextValue) => updateField(field.id, nextValue)}
              rows={4}
              placeholder={field.placeholder}
              className="min-h-[8.25rem]"
            />
          </JournalWritingCell>
        ))}
      </JournalWritingDeck>

      <JournalMetaStrip>
        <span>Write only the parts you would want on the next similar trade.</span>
        <span>&middot;</span>
        <span>Skip anything already obvious from the chart.</span>
      </JournalMetaStrip>
    </div>
  );
}
