"use client";

import { useEffect, useMemo, useState } from "react";

import { IconStrategies } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingListRows } from "@/components/ui/loading";
import {
  AppMetricCard,
  AppPageHeader,
  AppPanel,
  SectionHeader,
} from "@/components/ui/page-primitives";
import { InsetPanel, WidgetEmptyState } from "@/components/ui/surface-primitives";
import {
  createStrategy,
  deleteStrategy,
  getAllStrategiesWithStats,
  updateStrategy,
} from "@/lib/api/client/strategies";
import {
  normalizeStrategy,
  normalizeStrategyScope,
  type StrategyCardData,
} from "@/lib/strategies/view-model";
import {
  StrategyActionButton,
  StrategyLibraryItem,
  StrategyRulePointRow,
  StrategyStatusControl,
} from "@/components/strategies/strategy-primitives";

type StrategyEditorState = {
  name: string;
  rulePoints: string[];
  isActive: boolean;
};

const EMPTY_EDITOR: StrategyEditorState = {
  name: "",
  rulePoints: [""],
  isActive: true,
};

function createEditorFromStrategy(strategy: StrategyCardData): StrategyEditorState {
  return {
    name: strategy.name,
    rulePoints: strategy.rules.length > 0 ? strategy.rules : [""],
    isActive: strategy.isActive,
  };
}

function sanitizeRules(rulePoints: string[]) {
  return rulePoints.map((rule) => rule.trim()).filter(Boolean);
}

export function StrategyStudio({
  selectedAccountId,
}: {
  selectedAccountId: string | null | undefined;
}) {
  const [strategies, setStrategies] = useState<StrategyCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editor, setEditor] = useState<StrategyEditorState>(EMPTY_EDITOR);

  const selectedStrategy = useMemo(
    () => strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null,
    [selectedStrategyId, strategies],
  );
  const isNewMode = composerOpen && selectedStrategy === null;
  const activeStrategyCount = useMemo(
    () => strategies.filter((strategy) => strategy.isActive).length,
    [strategies],
  );
  const ruleCount = useMemo(
    () => sanitizeRules(editor.rulePoints).length,
    [editor.rulePoints],
  );

  async function loadStrategies(options?: {
    selectedId?: string | null;
    openComposer?: boolean;
  }) {
    try {
      setLoading(true);
      setError(null);

      const stats = await getAllStrategiesWithStats(
        normalizeStrategyScope(selectedAccountId),
      );

      const nextStrategies = stats.map((item) =>
        normalizeStrategy({
          ...item.strategy,
          stats: {
            totalTrades: item.totalTrades,
            winRate: item.winRate,
            avgRMultiple: item.avgRMultiple,
            totalPnl: item.totalPnl,
          },
        }),
      );

      setStrategies(nextStrategies);

      if (options?.selectedId) {
        const nextSelected =
          nextStrategies.find((strategy) => strategy.id === options.selectedId) ?? null;

        if (nextSelected) {
          setSelectedStrategyId(nextSelected.id);
          setEditor(createEditorFromStrategy(nextSelected));
          setComposerOpen(options.openComposer ?? true);
          return;
        }
      }

      setSelectedStrategyId(null);
      setEditor(EMPTY_EDITOR);
      setComposerOpen(false);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load strategies.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStrategies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  function openNewStrategy() {
    setSelectedStrategyId(null);
    setEditor(EMPTY_EDITOR);
    setComposerOpen(true);
    setError(null);
  }

  function openExistingStrategy(strategy: StrategyCardData) {
    setSelectedStrategyId(strategy.id);
    setEditor(createEditorFromStrategy(strategy));
    setComposerOpen(true);
    setError(null);
  }

  function closeComposer() {
    setSelectedStrategyId(null);
    setEditor(EMPTY_EDITOR);
    setComposerOpen(false);
    setError(null);
  }

  async function handleSave() {
    const rules = sanitizeRules(editor.rulePoints);
    if (!editor.name.trim()) {
      setError("Add a strategy name before saving.");
      return;
    }
    if (rules.length === 0) {
      setError("Add at least one rule before saving.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isNewMode) {
        const created = await createStrategy({
          name: editor.name.trim(),
          description: null,
          rules,
          isActive: editor.isActive,
        });
        await loadStrategies({ selectedId: created.id, openComposer: true });
      } else if (selectedStrategy) {
        await updateStrategy(selectedStrategy.id, {
          name: editor.name.trim(),
          description: selectedStrategy.description ?? null,
          rules,
          isActive: editor.isActive,
        });
        await loadStrategies({
          selectedId: selectedStrategy.id,
          openComposer: true,
        });
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save strategy.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedStrategy) {
      return;
    }

    if (!confirm("Delete this strategy? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      await deleteStrategy(selectedStrategy.id);
      await loadStrategies();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete strategy.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-root page-sections">
      <AppPageHeader
        className="stagger-1"
        eyebrow="Strategies"
        title="Strategies"
        description={`${strategies.length} saved strateg${strategies.length === 1 ? "y" : "ies"}. Create one and define its rule set.`}
        icon={<IconStrategies size={18} strokeWidth={1.8} />}
        actions={
          <StrategyActionButton tone="primary" onClick={openNewStrategy}>
            New Strategy
          </StrategyActionButton>
        }
      />

      {error ? (
        <InsetPanel tone="loss" className="stagger-2">
          <p className="text-sm font-semibold" style={{ color: "var(--loss-primary)" }}>
            {error}
          </p>
        </InsetPanel>
      ) : null}

      <section className="stagger-3 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <AppPanel className="p-5 sm:p-6">
          <SectionHeader
            eyebrow="Library"
            title="Saved Strategies"
            subtitle="Keep the library visible, then open one strategy into a working card."
          />

          <InsetPanel className="mb-0" paddingClassName="p-2 sm:p-3">
            {loading ? (
              <LoadingListRows count={3} compact />
            ) : strategies.length === 0 ? (
              <WidgetEmptyState
                icon={<IconStrategies size={18} strokeWidth={1.8} />}
                title="No saved strategies yet"
                description="Create the first one, then it opens inside the strategy card beside the library."
                action={
                  <StrategyActionButton tone="primary" onClick={openNewStrategy}>
                    New Strategy
                  </StrategyActionButton>
                }
              />
            ) : (
              <div className="space-y-3">
                {strategies.map((strategy) => (
                  <StrategyLibraryItem
                    key={strategy.id}
                    strategy={strategy}
                    selected={composerOpen && selectedStrategyId === strategy.id}
                    onOpen={() => openExistingStrategy(strategy)}
                  />
                ))}
              </div>
            )}
          </InsetPanel>
        </AppPanel>

        <AppPanel className="p-5 sm:p-6">
          <SectionHeader
            eyebrow={composerOpen ? (isNewMode ? "Creator Card" : "Strategy Card") : "Workspace Card"}
            title={
              composerOpen
                ? isNewMode
                  ? "Create Strategy"
                  : editor.name.trim() || selectedStrategy?.name || "Edit Strategy"
                : "Open a strategy"
            }
            subtitle={
              composerOpen
                ? "Keep the edits inside this card while the strategy library stays visible."
                : "Choose a strategy from the library or start a new one. The editor stays inside this card instead of taking over the page."
            }
            action={
              composerOpen ? (
                <StrategyActionButton tone="secondary" onClick={closeComposer}>
                  Close
                </StrategyActionButton>
              ) : null
            }
          />

          {!composerOpen ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <AppMetricCard
                  label="Saved Strategies"
                  value={`${strategies.length}`}
                  size="compact"
                  shell="elevated"
                />
                <AppMetricCard
                  label="Active Strategies"
                  value={`${activeStrategyCount}`}
                  tone={activeStrategyCount > 0 ? "profit" : "default"}
                  size="compact"
                  shell="elevated"
                />
              </div>

              <InsetPanel paddingClassName="p-4 sm:p-5">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  The editor opens as a card here.
                </p>
                <p
                  className="mt-1 text-sm leading-6"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Select a strategy from the left or start a new one. The library stays
                  in view, and the work happens inside this card instead of taking over
                  the entire page.
                </p>
              </InsetPanel>
            </div>
          ) : (
            <div className="grid gap-5">
              <div
                className={`grid gap-3 ${
                  isNewMode ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"
                }`}
              >
                <AppMetricCard
                  label="Status"
                  value={editor.isActive ? "Active" : "Paused"}
                  tone={editor.isActive ? "profit" : "default"}
                  size="compact"
                  shell="elevated"
                />
                <AppMetricCard
                  label="Rule Points"
                  value={`${ruleCount}`}
                  size="compact"
                  shell="elevated"
                />
                {!isNewMode ? (
                  <AppMetricCard
                    label="Linked Trades"
                    value={`${selectedStrategy?.stats.totalTrades ?? 0}`}
                    size="compact"
                    shell="elevated"
                  />
                ) : null}
                {!isNewMode ? (
                  <AppMetricCard
                    label="Win Rate"
                    value={`${(selectedStrategy?.stats.winRate ?? 0).toFixed(1)}%`}
                    tone={
                      (selectedStrategy?.stats.winRate ?? 0) >= 55
                        ? "profit"
                        : (selectedStrategy?.stats.winRate ?? 0) >= 45
                          ? "default"
                          : "loss"
                    }
                    size="compact"
                    shell="elevated"
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="strategy-name">Strategy Name</Label>
                <Input
                  id="strategy-name"
                  value={editor.name}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. London continuation reclaim"
                />
              </div>

              <StrategyStatusControl
                isActive={editor.isActive}
                onChange={(nextValue) =>
                  setEditor((current) => ({
                    ...current,
                    isActive: nextValue,
                  }))
                }
              />

              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Label>Rule Points</Label>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      Keep each rule as a separate point instead of a paragraph.
                    </p>
                  </div>

                  <StrategyActionButton
                    type="button"
                    tone="secondary"
                    onClick={() =>
                      setEditor((current) => ({
                        ...current,
                        rulePoints: [...current.rulePoints, ""],
                      }))
                    }
                  >
                    Add Point
                  </StrategyActionButton>
                </div>

                <InsetPanel paddingClassName="p-3 sm:p-4">
                  <div className="space-y-3">
                    {editor.rulePoints.map((rulePoint, index) => (
                      <StrategyRulePointRow
                        key={`rule-point-${index}`}
                        index={index}
                        value={rulePoint}
                        onChange={(nextValue) =>
                          setEditor((current) => ({
                            ...current,
                            rulePoints: current.rulePoints.map((point, pointIndex) =>
                              pointIndex === index ? nextValue : point,
                            ),
                          }))
                        }
                        onRemove={() =>
                          setEditor((current) => ({
                            ...current,
                            rulePoints:
                              current.rulePoints.length === 1
                                ? current.rulePoints
                                : current.rulePoints.filter(
                                    (_, pointIndex) => pointIndex !== index,
                                  ),
                          }))
                        }
                        canRemove={editor.rulePoints.length > 1}
                      />
                    ))}
                  </div>
                </InsetPanel>
              </div>

              <div className="flex flex-wrap gap-2">
                <StrategyActionButton
                  tone="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : isNewMode ? "Create Strategy" : "Save Changes"}
                </StrategyActionButton>

                {!isNewMode ? (
                  <StrategyActionButton
                    tone="danger"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </StrategyActionButton>
                ) : null}
              </div>
            </div>
          )}
        </AppPanel>
      </section>
    </div>
  );
}
