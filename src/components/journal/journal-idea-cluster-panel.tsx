"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { InsetPanel } from "@/components/ui/surface-primitives";
import {
  JournalChoiceChip,
  type JournalLibraryOption,
  JournalLibraryMultiPicker,
  JournalPromptField,
  JournalShortField,
} from "@/components/journal/journal-primitives";
import type { JournalPositionRole } from "@/domain/journal-types";

const POSITION_ROLE_OPTIONS: Array<{
  value: JournalPositionRole;
  label: string;
}> = [
  { value: "primary", label: "Primary" },
  { value: "add", label: "Add" },
  { value: "re-entry", label: "Re-entry" },
  { value: "trim", label: "Trim" },
  { value: "hedge", label: "Hedge" },
];

interface JournalIdeaMember {
  id: string;
  label: string;
  meta: string;
  pnlText: string;
  pnlTone: "profit" | "loss" | "neutral";
}

interface JournalIdeaClusterPanelProps {
  activeTradeId: string;
  tradeIdeaTitle: string;
  groupSummary: string;
  positionRole: JournalPositionRole | null;
  positionReason: string;
  isTrivial: boolean | null;
  trivialReason: string;
  tradeIdeaMembers: JournalIdeaMember[];
  relatedTradeOptions: JournalLibraryOption[];
  linkedTradeIds: string[];
  onSelectTrade: (tradeId: string) => void;
  onToggleLinkedTrade: (id: string) => void;
  onTradeIdeaTitleChange: (value: string) => void;
  onGroupSummaryChange: (value: string) => void;
  onPositionRoleChange: (value: JournalPositionRole | null) => void;
  onPositionReasonChange: (value: string) => void;
  onTrivialChange: (value: boolean | null) => void;
  onTrivialReasonChange: (value: string) => void;
}

export function JournalIdeaClusterPanel({
  activeTradeId,
  tradeIdeaTitle,
  groupSummary,
  positionRole,
  positionReason,
  isTrivial,
  trivialReason,
  tradeIdeaMembers,
  relatedTradeOptions,
  linkedTradeIds,
  onSelectTrade,
  onToggleLinkedTrade,
  onTradeIdeaTitleChange,
  onGroupSummaryChange,
  onPositionRoleChange,
  onPositionReasonChange,
  onTrivialChange,
  onTrivialReasonChange,
}: JournalIdeaClusterPanelProps) {
  const hasManualStructure = useMemo(
    () =>
      tradeIdeaTitle.trim().length > 0 ||
      groupSummary.trim().length > 0 ||
      positionReason.trim().length > 0 ||
      linkedTradeIds.length > 0 ||
      isTrivial != null,
    [
      groupSummary,
      isTrivial,
      linkedTradeIds.length,
      positionReason,
      tradeIdeaTitle,
    ],
  );
  const [open, setOpen] = useState(hasManualStructure || tradeIdeaMembers.length > 1);

  return (
    <InsetPanel className="space-y-4" paddingClassName="px-3.5 py-3 sm:px-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-label">Idea grouping</p>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                background: "var(--surface-elevated)",
                color: "var(--text-secondary)",
                fontSize: "10px",
                fontWeight: 700,
              }}
            >
              {tradeIdeaMembers.length}{" "}
              {tradeIdeaMembers.length === 1 ? "position" : "positions"}
            </span>
          </div>
          <p className="truncate text-xs text-[var(--text-tertiary)]">
            {groupSummary.trim()
              ? "Shared idea notes already attached."
              : "Open only if this trade belongs to a larger position cluster."}
          </p>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: "var(--text-tertiary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
          }}
        />
      </button>

      {open && tradeIdeaMembers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tradeIdeaMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelectTrade(member.id)}
              className="rounded-[14px] border px-3 py-2 text-left transition-colors"
              style={{
                background:
                  member.id === activeTradeId
                    ? "var(--accent-soft)"
                    : "var(--surface)",
                borderColor:
                  member.id === activeTradeId
                    ? "var(--accent-primary)"
                    : "var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{
                      color:
                        member.id === activeTradeId
                          ? "var(--accent-primary)"
                          : "var(--text-primary)",
                    }}
                  >
                    {member.label}
                  </p>
                  <p
                    className="truncate text-[11px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {member.meta}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[11px] font-semibold"
                  style={{
                    color:
                      member.pnlTone === "profit"
                        ? "var(--profit-primary)"
                        : member.pnlTone === "loss"
                          ? "var(--loss-primary)"
                          : "var(--text-secondary)",
                  }}
                >
                  {member.pnlText}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-3">
            <JournalShortField
              label="Idea title"
              value={tradeIdeaTitle}
              onChange={onTradeIdeaTitleChange}
              placeholder="One shared name for the whole idea"
            />
            <JournalPromptField
              prompt="Shared idea note"
              value={groupSummary}
              onChange={onGroupSummaryChange}
              rows={4}
              placeholder="Write the common read once, then keep each position-specific reason separate."
            />
            {relatedTradeOptions.length > 0 ? (
              <JournalLibraryMultiPicker
                label="Linked positions"
                options={relatedTradeOptions}
                values={linkedTradeIds}
                onToggle={onToggleLinkedTrade}
                placeholder="Search nearby positions"
                tone="accent"
              />
            ) : (
              <p className="text-xs text-[var(--text-tertiary)]">
                No nearby positions were detected for this idea.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-label">Role of this position</p>
              <div className="flex flex-wrap gap-2">
                {POSITION_ROLE_OPTIONS.map((option) => (
                  <JournalChoiceChip
                    key={option.value}
                    active={positionRole === option.value}
                    onClick={() =>
                      onPositionRoleChange(
                        positionRole === option.value ? null : option.value,
                      )
                    }
                    tone="accent"
                  >
                    {option.label}
                  </JournalChoiceChip>
                ))}
              </div>
            </div>

            <JournalPromptField
              prompt="Why this position existed"
              value={positionReason}
              onChange={onPositionReasonChange}
              rows={3}
              placeholder="Why did this exact add, trim, or re-entry belong inside the shared idea?"
            />

            <div className="space-y-2">
              <p className="text-label">Queue handling</p>
              <div className="flex flex-wrap gap-2">
                <JournalChoiceChip
                  active={isTrivial === null}
                  onClick={() => onTrivialChange(null)}
                >
                  Auto detect
                </JournalChoiceChip>
                <JournalChoiceChip
                  active={isTrivial === false}
                  onClick={() => onTrivialChange(false)}
                  tone="accent"
                >
                  Full review
                </JournalChoiceChip>
                <JournalChoiceChip
                  active={isTrivial === true}
                  onClick={() => onTrivialChange(true)}
                  tone="warning"
                >
                  Mark trivial
                </JournalChoiceChip>
              </div>
            </div>

            {isTrivial === true ? (
              <JournalPromptField
                prompt="Why should this stay trivial?"
                value={trivialReason}
                onChange={onTrivialReasonChange}
                rows={2}
                placeholder="Short reason only."
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </InsetPanel>
  );
}
