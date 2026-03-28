"use client";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingListRows } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { AppPanel } from "@/components/ui/page-primitives";
import {
  ControlSurface,
  FieldGroup,
} from "@/components/ui/control-primitives";
import {
  InsetPanel,
  WidgetEmptyState,
} from "@/components/ui/surface-primitives";
import type { PlaybookCardData } from "@/lib/playbooks/view-model";

interface StrategyLibraryRailProps {
  playbooks: PlaybookCardData[];
  totalCount: number;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onStartCreating: () => void;
  selectedPlaybookId: string | null;
  onSelect: (playbookId: string) => void;
}

export function StrategyLibraryRail({
  playbooks,
  totalCount,
  loading,
  search,
  onSearchChange,
  onClearSearch,
  onStartCreating,
  selectedPlaybookId,
  onSelect,
}: StrategyLibraryRailProps) {
  return (
    <AppPanel className="flex min-h-0 flex-col p-4">
      <Button onClick={onStartCreating} className="mb-4 justify-start">
        <Plus className="h-4 w-4" />
        New Strategy
      </Button>

      <ControlSurface className="mb-4">
        <FieldGroup
          label="Search library"
          meta={
            <span
              className="text-[0.72rem]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {playbooks.length} result{playbooks.length === 1 ? "" : "s"}
            </span>
          }
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search strategies..."
              className="pl-9"
            />
          </div>
        </FieldGroup>
      </ControlSurface>

      <div className="mb-3 px-1">
        <p className="text-label">Library</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <LoadingListRows count={5} compact />
        ) : playbooks.length === 0 ? (
          <WidgetEmptyState
            title={
              totalCount > 0 ? "No strategies match your search" : "No strategies yet"
            }
            description={
              totalCount > 0
                ? "Try a broader search to bring matching strategies back into view."
                : "Create your first strategy and it will appear here for review."
            }
            action={
              totalCount > 0 ? (
                <Button size="sm" variant="outline" onClick={onClearSearch}>
                  Clear Search
                </Button>
              ) : (
                <Button size="sm" onClick={onStartCreating}>
                  <Plus className="h-4 w-4" />
                  Create Strategy
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-2">
            {playbooks.map((playbook) => {
              const selected = playbook.id === selectedPlaybookId;

              return (
                <button
                  key={playbook.id}
                  type="button"
                  onClick={() => onSelect(playbook.id)}
                  className="block w-full text-left"
                >
                  <InsetPanel
                    tone={selected ? "accent" : "default"}
                    className="transition-colors"
                    paddingClassName="px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="truncate text-[0.84rem] font-medium"
                          style={{
                            color: selected
                              ? "var(--accent-primary)"
                              : "var(--text-primary)",
                          }}
                        >
                          {playbook.name}
                        </p>
                        <p
                          className="mt-1 text-[0.72rem]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {playbook.stats.totalTrades} trades ·{" "}
                          {playbook.stats.winRate.toFixed(1)}% win rate
                        </p>
                      </div>
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          background: playbook.isActive
                            ? "var(--profit-primary)"
                            : "var(--text-tertiary)",
                        }}
                      />
                    </div>
                  </InsetPanel>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppPanel>
  );
}
