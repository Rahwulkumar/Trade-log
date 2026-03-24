"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { format } from "date-fns";
import { ChevronDown, Minus, TrendingDown, TrendingUp } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import {
  AppTextArea,
  ChecklistRow,
  ChoiceChip,
  ControlSurface,
  FieldGroup,
  ValueBar,
} from "@/components/ui/control-primitives";
import { AppPanel, SectionHeader } from "@/components/ui/page-primitives";
import { getDailyPlan, upsertDailyPlan, type DailyPlanResponse } from "@/lib/api/client/daily-plans";
import { getActivePlaybooks, type Playbook } from "@/lib/api/client/playbooks";

const AUTOSAVE_MS = 900;
const TODAY = format(new Date(), "yyyy-MM-dd");

const BIAS_OPTIONS = [
  {
    value: "Bullish",
    icon: TrendingUp,
    color: "var(--profit-primary)",
    background: "var(--profit-bg)",
  },
  {
    value: "Neutral",
    icon: Minus,
    color: "var(--text-secondary)",
    background: "var(--surface-hover)",
  },
  {
    value: "Bearish",
    icon: TrendingDown,
    color: "var(--loss-primary)",
    background: "var(--loss-bg)",
  },
] as const;

const GRADE_OPTIONS = ["A", "B", "C", "D", "F"] as const;

function getGradeTone(grade: (typeof GRADE_OPTIONS)[number]) {
  if (grade === "A") {
    return {
      color: "var(--profit-primary)",
      background: "var(--profit-bg)",
    };
  }
  if (grade === "B") {
    return {
      color: "var(--accent-primary)",
      background: "var(--accent-soft)",
    };
  }
  if (grade === "C") {
    return {
      color: "var(--text-primary)",
      background: "var(--surface-hover)",
    };
  }
  return {
    color: "var(--loss-primary)",
    background: "var(--loss-bg)",
  };
}

export function TodayPlanWidget() {
  const { profile } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [bias, setBias] = useState<string | null | undefined>(undefined);
  const [playbookId, setPlaybookId] = useState<string | null | undefined>(
    undefined,
  );
  const [universalChecked, setUniversalChecked] = useState<
    string[] | undefined
  >(undefined);
  const [strategyChecked, setStrategyChecked] = useState<
    string[] | undefined
  >(undefined);
  const [preNote, setPreNote] = useState<string | undefined>(undefined);
  const [dayGrade, setDayGrade] = useState<string | null | undefined>(
    undefined,
  );
  const [playbookOpen, setPlaybookOpen] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbookRef = useRef<HTMLDivElement | null>(null);

  const resolvedBias = bias !== undefined ? bias : (plan?.bias ?? null);
  const resolvedPlaybookId =
    playbookId !== undefined ? playbookId : (plan?.playbookId ?? null);
  const resolvedUniversalChecked = useMemo(
    () => universalChecked ?? plan?.universalRulesChecked ?? [],
    [plan?.universalRulesChecked, universalChecked],
  );
  const resolvedStrategyChecked = useMemo(
    () => strategyChecked ?? plan?.strategyRulesChecked ?? [],
    [plan?.strategyRulesChecked, strategyChecked],
  );
  const resolvedPreNote = preNote !== undefined ? preNote : (plan?.preNote ?? "");
  const resolvedDayGrade =
    dayGrade !== undefined ? dayGrade : (plan?.dayGrade ?? null);

  const latestRef = useRef({
    bias: resolvedBias,
    playbookId: resolvedPlaybookId,
    universalChecked: resolvedUniversalChecked,
    strategyChecked: resolvedStrategyChecked,
    preNote: resolvedPreNote,
    dayGrade: resolvedDayGrade,
  });

  const universalRules: string[] = profile?.trading_rules ?? [];
  const selectedPlaybook = playbooks.find((p) => p.id === resolvedPlaybookId) ?? null;
  const strategyRules: string[] = (selectedPlaybook?.rules as string[]) ?? [];

  useEffect(() => {
    latestRef.current = {
      bias: resolvedBias,
      playbookId: resolvedPlaybookId,
      universalChecked: resolvedUniversalChecked,
      strategyChecked: resolvedStrategyChecked,
      preNote: resolvedPreNote,
      dayGrade: resolvedDayGrade,
    };
  }, [
    resolvedBias,
    resolvedDayGrade,
    resolvedPlaybookId,
    resolvedPreNote,
    resolvedStrategyChecked,
    resolvedUniversalChecked,
  ]);

  useEffect(() => {
    async function load() {
      try {
        const [dailyPlanResult, activePlaybooksResult] = await Promise.allSettled([
          getDailyPlan(TODAY),
          getActivePlaybooks(),
        ]);
        if (dailyPlanResult.status === "fulfilled") {
          setPlan(dailyPlanResult.value);
        }

        if (activePlaybooksResult.status === "fulfilled") {
          setPlaybooks(activePlaybooksResult.value);
        } else {
          console.error("Failed to load active playbooks:", activePlaybooksResult.reason);
          setPlaybooks([]);
        }
      } catch (error) {
        console.error("Failed to load today's plan:", error);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    if (!playbookOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        playbookRef.current &&
        !playbookRef.current.contains(event.target as Node)
      ) {
        setPlaybookOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [playbookOpen]);

  function scheduleAutoSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const value = latestRef.current;

      void upsertDailyPlan({
        date: TODAY,
        bias: (value.bias as "Bullish" | "Neutral" | "Bearish" | null) ?? null,
        playbook_id: value.playbookId,
        universal_rules_checked: value.universalChecked,
        strategy_rules_checked: value.strategyChecked,
        pre_note: value.preNote || null,
        day_grade:
          (value.dayGrade as "A" | "B" | "C" | "D" | "F" | null) ?? null,
      })
        .then((saved) => setPlan(saved))
        .catch(() => {});
    }, AUTOSAVE_MS);
  }

  function toggleBias(value: string) {
    setBias((prev) => {
      const current = prev !== undefined ? prev : (plan?.bias ?? null);
      return current === value ? null : value;
    });
    scheduleAutoSave();
  }

  function toggleUniversalRule(rule: string) {
    setUniversalChecked((prev) => {
      const current = prev ?? plan?.universalRulesChecked ?? [];
      return current.includes(rule)
        ? current.filter((item) => item !== rule)
        : [...current, rule];
    });
    scheduleAutoSave();
  }

  function toggleStrategyRule(rule: string) {
    setStrategyChecked((prev) => {
      const current = prev ?? plan?.strategyRulesChecked ?? [];
      return current.includes(rule)
        ? current.filter((item) => item !== rule)
        : [...current, rule];
    });
    scheduleAutoSave();
  }

  function selectPlaybook(id: string | null) {
    setPlaybookId(id);
    setStrategyChecked([]);
    setPlaybookOpen(false);
    scheduleAutoSave();
  }

  if (loading) {
    return (
      <AppPanel className="p-5">
        <div className="skeleton h-40 w-full rounded-[var(--radius-lg)]" />
      </AppPanel>
    );
  }

  const universalProgress = universalRules.length
    ? Math.round((resolvedUniversalChecked.length / universalRules.length) * 100)
    : 0;
  const strategyProgress = strategyRules.length
    ? Math.round((resolvedStrategyChecked.length / strategyRules.length) * 100)
    : 0;

  return (
    <AppPanel className="overflow-visible p-0">
      <div
        className="px-5 py-4"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <SectionHeader
          className="mb-0"
          title="Today's Plan"
          subtitle={format(new Date(), "EEEE, MMMM d")}
          action={
            <div className="flex flex-col gap-1 sm:items-end">
              <p className="text-label">Day Grade</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {GRADE_OPTIONS.map((grade) => {
                  const active = resolvedDayGrade === grade;
                  const tone = getGradeTone(grade);

                  return (
                    <ChoiceChip
                      key={grade}
                      active={active}
                      compact
                      activeColor={active ? "var(--text-inverse)" : tone.color}
                      activeBackground={tone.color}
                      activeBorderColor={tone.color}
                      inactiveColor="var(--text-tertiary)"
                      onClick={() => {
                        setDayGrade(active ? null : grade);
                        scheduleAutoSave();
                      }}
                    >
                      {grade}
                    </ChoiceChip>
                  );
                })}
              </div>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-4">
          <ControlSurface>
            <FieldGroup label="Market Bias">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {BIAS_OPTIONS.map(({ value, icon: Icon, color, background }) => {
                  const active = resolvedBias === value;

                  return (
                    <ChoiceChip
                      key={value}
                      active={active}
                      icon={<Icon className="h-3.5 w-3.5" />}
                      activeColor={color}
                      activeBackground={background}
                      activeBorderColor={color}
                      onClick={() => toggleBias(value)}
                    >
                      {value}
                    </ChoiceChip>
                  );
                })}
              </div>
            </FieldGroup>
          </ControlSurface>

          <ControlSurface className="overflow-visible">
            <FieldGroup label="Today's Strategy">
              <div className="relative" ref={playbookRef}>
                <button
                  type="button"
                  onClick={() => setPlaybookOpen((open) => !open)}
                  aria-expanded={playbookOpen}
                  className="flex w-full items-center justify-between rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-[0.8125rem] transition-colors hover:bg-[var(--surface-hover)]"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border-subtle)",
                    color: resolvedPlaybookId
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                  }}
                >
                  <span className="truncate">
                    {selectedPlaybook?.name ?? "No strategy selected"}
                  </span>
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0"
                    style={{
                      color: "var(--text-tertiary)",
                      transform: playbookOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </button>

                {playbookOpen ? (
                  <div
                    className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-[var(--radius-md)] border"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border-subtle)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => selectPlaybook(null)}
                      className="w-full px-3 py-2.5 text-left text-[0.8125rem] transition-colors hover:bg-[var(--surface-hover)]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      No strategy
                    </button>
                    {playbooks.map((playbook) => {
                      const selected = playbook.id === resolvedPlaybookId;

                      return (
                        <button
                          key={playbook.id}
                          type="button"
                          onClick={() => selectPlaybook(playbook.id)}
                          className="w-full px-3 py-2.5 text-left text-[0.8125rem] transition-colors hover:bg-[var(--surface-hover)]"
                          style={{
                            color: selected
                              ? "var(--accent-primary)"
                              : "var(--text-primary)",
                            background: selected
                              ? "var(--accent-soft)"
                              : "transparent",
                          }}
                        >
                          {playbook.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </FieldGroup>
          </ControlSurface>
        </div>

        <div className="space-y-4">
          {universalRules.length > 0 ? (
            <ControlSurface>
              <FieldGroup
                label="Universal Rules"
                meta={
                  <span
                    className="mono text-[0.6875rem]"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    {resolvedUniversalChecked.length}/{universalRules.length}
                  </span>
                }
              >
                <ValueBar value={universalProgress} />
                <div className="space-y-0.5">
                  {universalRules.map((rule) => (
                    <ChecklistRow
                      key={rule}
                      text={rule}
                      checked={resolvedUniversalChecked.includes(rule)}
                      onToggle={() => toggleUniversalRule(rule)}
                    />
                  ))}
                </div>
              </FieldGroup>
            </ControlSurface>
          ) : null}

          {strategyRules.length > 0 ? (
            <ControlSurface>
              <FieldGroup
                label="Strategy Rules"
                meta={
                  <span
                    className="mono text-[0.6875rem]"
                    style={{ color: "var(--profit-primary)" }}
                  >
                    {resolvedStrategyChecked.length}/{strategyRules.length}
                  </span>
                }
              >
                <ValueBar
                  value={strategyProgress}
                  color="var(--profit-primary)"
                />
                <div className="space-y-0.5">
                  {strategyRules.map((rule) => (
                    <ChecklistRow
                      key={rule}
                      text={rule}
                      checked={resolvedStrategyChecked.includes(rule)}
                      onToggle={() => toggleStrategyRule(rule)}
                    />
                  ))}
                </div>
              </FieldGroup>
            </ControlSurface>
          ) : null}

          {universalRules.length === 0 && strategyRules.length === 0 ? (
            <ControlSurface>
              <FieldGroup label="Rules">
                <p
                  className="text-[0.75rem] leading-relaxed"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Add universal rules in Settings under Trading, or select a
                  strategy above.
                </p>
              </FieldGroup>
            </ControlSurface>
          ) : null}
        </div>
      </div>

      <div
        className="px-5 pb-5 pt-1"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <ControlSurface>
          <FieldGroup label="Pre-market Note">
            <AppTextArea
              value={resolvedPreNote}
              onChange={(event) => {
                setPreNote(event.target.value);
                scheduleAutoSave();
              }}
              placeholder="Key levels, news events, focus for today..."
              rows={3}
              maxLength={5000}
            />
          </FieldGroup>
        </ControlSurface>
      </div>
    </AppPanel>
  );
}
