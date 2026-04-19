"use client";

import { useCallback, useMemo } from "react";

import { parseJournalBrief, serializeJournalBrief } from "@/domain/journal-brief";
import { JournalDetailDisclosure } from "@/components/journal/journal-primitives";
import {
  JournalWritingArea,
  JournalWritingCell,
  JournalWritingDeck,
} from "@/components/journal/journal-writing-primitives";

export function JournalNarrativeCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const brief = useMemo(() => parseJournalBrief(value), [value]);

  const updateField = useCallback(
    (field: "trigger" | "management" | "exit", nextValue: string) => {
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
      <JournalWritingDeck className="grid">
        <JournalWritingCell
          step="01"
          title="What happened"
          hint="If you reread this before the next similar trade, what should it remind you of?"
        >
          <JournalWritingArea
            value={brief.trigger}
            onChange={(nextValue) => updateField("trigger", nextValue)}
            rows={5}
            placeholder="State the setup, the trigger, and how the trade actually played out."
            className="min-h-[9rem]"
          />
        </JournalWritingCell>
      </JournalWritingDeck>

      <JournalDetailDisclosure
        title="Adds and exit"
        description="Open only if the extra positions or the final exit need their own reason."
        defaultOpen={
          brief.management.trim().length > 0 || brief.exit.trim().length > 0
        }
      >
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="space-y-2">
            <p className="text-label">Why add or trim?</p>
            <JournalWritingArea
              value={brief.management}
              onChange={(nextValue) => updateField("management", nextValue)}
              rows={4}
              placeholder="If you changed size, explain why."
            />
          </div>

          <div className="space-y-2">
            <p className="text-label">Why fully out?</p>
            <JournalWritingArea
              value={brief.exit}
              onChange={(nextValue) => updateField("exit", nextValue)}
              rows={4}
              placeholder="What made you close the trade completely?"
            />
          </div>
        </div>
      </JournalDetailDisclosure>
    </div>
  );
}
