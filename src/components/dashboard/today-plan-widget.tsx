"use client";

import { useEffect, useState, useRef } from "react";
import { Check, ChevronDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { format } from "date-fns";
import { getDailyPlan, upsertDailyPlan, type DailyPlanResponse } from "@/lib/api/client/daily-plans";
import { getActivePlaybooks, type Playbook } from "@/lib/api/client/playbooks";
import { useAuth } from "@/components/auth-provider";

const AUTOSAVE_MS = 900;
const TODAY = format(new Date(), "yyyy-MM-dd");

const BIAS_OPTIONS = [
  { value: "Bullish", icon: TrendingUp, color: "var(--profit-primary)", bg: "var(--profit-bg)" },
  { value: "Neutral", icon: Minus, color: "var(--text-secondary)", bg: "var(--surface-elevated)" },
  { value: "Bearish", icon: TrendingDown, color: "var(--loss-primary)", bg: "var(--loss-bg)" },
] as const;

const GRADE_OPTIONS = ["A", "B", "C", "D", "F"] as const;

// ─── Rule checklist row ───────────────────────────────────────────────────────
function RuleRow({
  text,
  checked,
  onToggle,
}: {
  text: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-2.5 py-1.5 text-left transition-opacity"
      style={{ opacity: checked ? 0.55 : 1 }}
    >
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded"
        style={{
          border: checked ? "none" : "1.5px solid var(--border-subtle)",
          background: checked ? "var(--accent-primary)" : "transparent",
          transition: "background 0.15s, border 0.15s",
        }}
      >
        {checked && <Check className="h-2.5 w-2.5" style={{ color: "var(--text-inverse, #fff)" }} strokeWidth={3} />}
      </span>
      <span
        className="text-[0.8125rem] leading-snug"
        style={{
          color: "var(--text-primary)",
          textDecoration: checked ? "line-through" : "none",
        }}
      >
        {text}
      </span>
    </button>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export function TodayPlanWidget() {
  const { profile } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields — undefined means "use plan value"
  const [bias, setBias] = useState<string | null | undefined>(undefined);
  const [playbookId, setPlaybookId] = useState<string | null | undefined>(undefined);
  const [universalChecked, setUniversalChecked] = useState<string[] | undefined>(undefined);
  const [strategyChecked, setStrategyChecked] = useState<string[] | undefined>(undefined);
  const [preNote, setPreNote] = useState<string | undefined>(undefined);
  const [dayGrade, setDayGrade] = useState<string | null | undefined>(undefined);
  const [playbookOpen, setPlaybookOpen] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolved values (local override wins over plan)
  const resolvedBias = bias !== undefined ? bias : (plan?.bias ?? null);
  const resolvedPlaybookId = playbookId !== undefined ? playbookId : (plan?.playbookId ?? null);
  const resolvedUniversalChecked = universalChecked ?? plan?.universalRulesChecked ?? [];
  const resolvedStrategyChecked = strategyChecked ?? plan?.strategyRulesChecked ?? [];
  const resolvedPreNote = preNote !== undefined ? preNote : (plan?.preNote ?? "");
  const resolvedDayGrade = dayGrade !== undefined ? dayGrade : (plan?.dayGrade ?? null);

  const universalRules: string[] = profile?.trading_rules ?? [];
  const selectedPlaybook = playbooks.find((p) => p.id === resolvedPlaybookId) ?? null;
  const strategyRules: string[] = (selectedPlaybook?.rules as string[]) ?? [];

  // Ref that always holds the latest resolved values — prevents stale closure in setTimeout
  const latestRef = useRef({
    bias: resolvedBias,
    playbookId: resolvedPlaybookId,
    universalChecked: resolvedUniversalChecked,
    strategyChecked: resolvedStrategyChecked,
    preNote: resolvedPreNote,
    dayGrade: resolvedDayGrade,
  });
  useEffect(() => {
    latestRef.current = {
      bias: resolvedBias,
      playbookId: resolvedPlaybookId,
      universalChecked: resolvedUniversalChecked,
      strategyChecked: resolvedStrategyChecked,
      preNote: resolvedPreNote,
      dayGrade: resolvedDayGrade,
    };
  });

  // Load plan + playbooks on mount
  useEffect(() => {
    Promise.all([getDailyPlan(TODAY), getActivePlaybooks()]).then(([p, pbs]) => {
      setPlan(p);
      setPlaybooks(pbs);
      setLoading(false);
    });
  }, []);

  // Auto-save using latestRef to avoid stale closures
  function scheduleAutoSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const v = latestRef.current;
      upsertDailyPlan({
        date: TODAY,
        bias: (v.bias as "Bullish" | "Neutral" | "Bearish" | null) ?? null,
        playbook_id: v.playbookId,
        universal_rules_checked: v.universalChecked,
        strategy_rules_checked: v.strategyChecked,
        pre_note: v.preNote || null,
        day_grade: (v.dayGrade as "A" | "B" | "C" | "D" | "F" | null) ?? null,
      })
        .then((saved) => setPlan(saved))
        .catch(() => {});
    }, AUTOSAVE_MS);
  }

  function toggleBias(value: string) {
    setBias((prev) => {
      const current = prev !== undefined ? prev : plan?.bias ?? null;
      return current === value ? null : value;
    });
    scheduleAutoSave();
  }

  function toggleUniversalRule(rule: string) {
    setUniversalChecked((prev) => {
      const current = prev ?? plan?.universalRulesChecked ?? [];
      return current.includes(rule) ? current.filter((r) => r !== rule) : [...current, rule];
    });
    scheduleAutoSave();
  }

  function toggleStrategyRule(rule: string) {
    setStrategyChecked((prev) => {
      const current = prev ?? plan?.strategyRulesChecked ?? [];
      return current.includes(rule) ? current.filter((r) => r !== rule) : [...current, rule];
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
      <div
        className="animate-pulse"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          height: 180,
        }}
      />
    );
  }

  const universalProgress = universalRules.length
    ? Math.round((resolvedUniversalChecked.length / universalRules.length) * 100)
    : 0;

  const strategyProgress = strategyRules.length
    ? Math.round((resolvedStrategyChecked.length / strategyRules.length) * 100)
    : 0;

  return (
    <div
      className="surface overflow-hidden"
      style={{ border: "1px solid var(--border-subtle)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div>
          <h3 className="text-[0.8125rem] font-semibold" style={{ color: "var(--text-primary)" }}>
            Today&apos;s Plan
          </h3>
          <p className="text-[0.7rem]" style={{ color: "var(--text-tertiary)" }}>
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>

        {/* Day Grade */}
        <div className="flex items-center gap-1.5">
          {GRADE_OPTIONS.map((g) => {
            const active = resolvedDayGrade === g;
            const gradeColor =
              g === "A" ? "var(--profit-primary)"
              : g === "B" ? "var(--accent-primary)"
              : g === "C" ? "var(--text-secondary)"
              : "var(--loss-primary)";
            return (
              <button
                key={g}
                type="button"
                onClick={() => { setDayGrade(active ? null : g); scheduleAutoSave(); }}
                className="h-7 w-7 rounded text-[0.7rem] font-bold"
                style={{
                  background: active ? gradeColor : "var(--surface-raised)",
                  color: active ? "#ffffff" : "var(--text-tertiary)",
                  border: active ? "none" : "1px solid var(--border-subtle)",
                  transition: "background-color 0.15s ease, color 0.15s ease",
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
        {/* LEFT: Bias + Playbook */}
        <div
          className="px-5 py-4 space-y-4"
          style={{ borderRight: "1px solid var(--border-subtle)" }}
        >
          {/* Market Bias */}
          <div>
            <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Market Bias
            </p>
            <div className="flex gap-2">
              {BIAS_OPTIONS.map(({ value, icon: Icon, color, bg }) => {
                const active = resolvedBias === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleBias(value)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] py-2 text-[0.75rem] font-medium"
                    style={{
                      background: active ? bg : "var(--surface-raised)",
                      border: active ? `1.5px solid ${color}` : "1.5px solid var(--border-subtle)",
                      color: active ? color : "var(--text-secondary)",
                      transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {value}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Playbook Selector */}
          <div className="relative">
            <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Today&apos;s Strategy
            </p>
            <button
              type="button"
              onClick={() => setPlaybookOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-2.5 text-left text-[0.8125rem]"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-subtle)",
                color: resolvedPlaybookId ? "var(--text-primary)" : "var(--text-tertiary)",
                transition: "border-color 0.15s ease",
              }}
            >
              <span>{selectedPlaybook?.name ?? "No strategy selected"}</span>
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0"
                style={{
                  color: "var(--text-tertiary)",
                  transform: playbookOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
            {playbookOpen && (
              <div
                className="absolute left-0 right-0 z-20 mt-1 overflow-hidden"
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <button
                  type="button"
                  onClick={() => selectPlaybook(null)}
                  className="w-full px-3 py-2.5 text-left text-[0.8125rem]"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-hover)";
                    e.currentTarget.style.color = "var(--accent-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-tertiary)";
                  }}
                >
                  No strategy
                </button>
                {playbooks.map((pb) => (
                  <button
                    key={pb.id}
                    type="button"
                    onClick={() => selectPlaybook(pb.id)}
                    className="w-full px-3 py-2.5 text-left text-[0.8125rem]"
                    style={{
                      color: pb.id === resolvedPlaybookId ? "var(--accent-primary)" : "var(--text-primary)",
                      background: pb.id === resolvedPlaybookId ? "var(--accent-soft)" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (pb.id !== resolvedPlaybookId) {
                        e.currentTarget.style.background = "var(--surface-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = pb.id === resolvedPlaybookId ? "var(--accent-soft)" : "transparent";
                    }}
                  >
                    {pb.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Checklists */}
        <div className="px-5 py-4 space-y-4">
          {/* Universal Rules Checklist */}
          {universalRules.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Universal Rules
                </p>
                <span className="text-[0.6875rem] font-mono" style={{ color: "var(--accent-primary)" }}>
                  {resolvedUniversalChecked.length}/{universalRules.length}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mb-2 h-1 w-full rounded-full" style={{ background: "var(--border-subtle)" }}>
                <div
                  className="h-1 rounded-full transition-all duration-300"
                  style={{ width: `${universalProgress}%`, background: "var(--accent-primary)" }}
                />
              </div>
              <div className="space-y-0.5">
                {universalRules.map((rule) => (
                  <RuleRow
                    key={rule}
                    text={rule}
                    checked={resolvedUniversalChecked.includes(rule)}
                    onToggle={() => toggleUniversalRule(rule)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Strategy Rules Checklist */}
          {strategyRules.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Strategy Rules
                </p>
                <span className="text-[0.6875rem] font-mono" style={{ color: "var(--profit-primary)" }}>
                  {resolvedStrategyChecked.length}/{strategyRules.length}
                </span>
              </div>
              <div className="mb-2 h-1 w-full rounded-full" style={{ background: "var(--border-subtle)" }}>
                <div
                  className="h-1 rounded-full transition-all duration-300"
                  style={{ width: `${strategyProgress}%`, background: "var(--profit-primary)" }}
                />
              </div>
              <div className="space-y-0.5">
                {strategyRules.map((rule) => (
                  <RuleRow
                    key={rule}
                    text={rule}
                    checked={resolvedStrategyChecked.includes(rule)}
                    onToggle={() => toggleStrategyRule(rule)}
                  />
                ))}
              </div>
            </div>
          )}

          {universalRules.length === 0 && strategyRules.length === 0 && (
            <p className="py-2 text-[0.75rem]" style={{ color: "var(--text-tertiary)" }}>
              Add universal rules in Settings → Trading, or select a strategy above.
            </p>
          )}
        </div>
      </div>

      {/* Pre-market note */}
      <div
        className="px-5 pb-5"
        style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}
      >
        <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Pre-market Note
        </p>
        <textarea
          value={resolvedPreNote}
          onChange={(e) => { setPreNote(e.target.value); scheduleAutoSave(); }}
          placeholder="Key levels, news events, focus for today…"
          rows={2}
          className="w-full resize-none px-3 py-2.5 text-[0.8125rem] leading-relaxed focus:outline-none"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            transition: "border-color 0.15s ease",
          }}
          maxLength={5000}
        />
      </div>
    </div>
  );
}
