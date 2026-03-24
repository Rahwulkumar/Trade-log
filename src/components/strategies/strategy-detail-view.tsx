"use client";

import { AppPanel, SectionHeader } from "@/components/ui/page-primitives";
import {
  InsetPanel,
  WidgetEmptyState,
} from "@/components/ui/surface-primitives";
import { PlaybookCard } from "@/components/playbooks/playbook-card";
import type { PlaybookCardData } from "@/lib/playbooks/view-model";

interface StrategyDetailViewProps {
  playbook: PlaybookCardData | null;
  onManage: (playbookId: string) => void;
  onDuplicate: (playbookId: string) => void;
  onToggleActive: (playbookId: string) => void;
  onDelete: (playbookId: string) => void;
}

export function StrategyDetailView({
  playbook,
  onManage,
  onDuplicate,
  onToggleActive,
  onDelete,
}: StrategyDetailViewProps) {
  if (!playbook) {
    return (
      <AppPanel>
        <WidgetEmptyState
          title="Select a strategy"
          description="Choose a strategy from the library to review its rules, performance, and current status."
        />
      </AppPanel>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <div className="space-y-4">
        <AppPanel className="p-6">
          <SectionHeader
            title="Execution Rules"
            subtitle={`${playbook.rules.length} rule${playbook.rules.length === 1 ? "" : "s"} currently define this strategy.`}
          />

          {playbook.rules.length === 0 ? (
            <WidgetEmptyState
              title="No rules added"
              description="Add explicit execution rules so this strategy can be reviewed and repeated consistently."
            />
          ) : (
            <div className="space-y-3">
              {playbook.rules.map((rule, index) => (
                <InsetPanel key={`${playbook.id}-${index}`}>
                  <div className="flex items-start gap-3">
                    <span
                      className="mono mt-0.5 inline-flex min-w-7 justify-center rounded-full px-2 py-1 text-[0.72rem]"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent-primary)",
                      }}
                    >
                      {index + 1}
                    </span>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {rule}
                    </p>
                  </div>
                </InsetPanel>
              ))}
            </div>
          )}
        </AppPanel>

        <AppPanel className="p-6">
          <SectionHeader
            title="Strategy Notes"
            subtitle="Summary context for when this setup should appear and why it exists."
          />
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {playbook.description ||
              "No strategy narrative has been written yet. Use the manage flow to add market context, trigger logic, and execution intent."}
          </p>
        </AppPanel>
      </div>

      <PlaybookCard
        playbook={playbook}
        onManage={onManage}
        onDuplicate={onDuplicate}
        onToggleActive={onToggleActive}
        onDelete={onDelete}
      />
    </div>
  );
}
