"use client";

import { useCallback, useMemo } from "react";

import { parseJournalBrief, serializeJournalBrief } from "@/domain/journal-brief";
import { AppTextArea } from "@/components/ui/control-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";

const NARRATIVE_FIELDS = [
  {
    id: "trigger" as const,
    step: "01",
    title: "Why you took it",
    hint: "The setup or shift that got you in.",
    placeholder: "Liquidity sweep into prior low and confirmation back above the range.",
  },
  {
    id: "management" as const,
    step: "02",
    title: "What changed",
    hint: "The part worth remembering after entry.",
    placeholder: "Held the first pullback, then trimmed early when the impulse stalled.",
  },
  {
    id: "exit" as const,
    step: "03",
    title: "Why it ended",
    hint: "The actual reason you were out.",
    placeholder: "Closed after structure broke instead of waiting for the target.",
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
            Three short notes. Enough to understand the trade on a reread.
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

      <div className="grid gap-3 xl:grid-cols-3">
        {NARRATIVE_FIELDS.map((field) => (
          <InsetPanel
            key={field.id}
            className="space-y-3"
            paddingClassName="px-3.5 py-3.5 sm:px-4 sm:py-4"
          >
            <div className="flex items-start gap-3">
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {field.step}
              </span>
              <div className="min-w-0 space-y-1">
                <p
                  style={{
                    color: "var(--text-primary)",
                    fontFamily:
                      "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                    fontSize: "14px",
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  {field.title}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {field.hint}
                </p>
              </div>
            </div>

            <AppTextArea
              value={brief[field.id]}
              onChange={(event) => updateField(field.id, event.target.value)}
              rows={3}
              placeholder={field.placeholder}
              className="min-h-[7.25rem] rounded-[var(--radius-lg)] px-0 py-0 text-[0.9rem]"
              style={{
                background: "transparent",
                borderColor: "transparent",
                color: "var(--text-primary)",
                lineHeight: 1.65,
              }}
            />
          </InsetPanel>
        ))}
      </div>

      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        Skip market recap, system notes, and anything already obvious from the chart.
      </p>
    </div>
  );
}
