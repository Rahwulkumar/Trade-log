import type { Playbook, SetupDefinition, Trade } from "@/lib/db/schema";
import type { RuleItemStatus, RuleSetWithItems } from "@/lib/rulebooks/types";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";

import type {
  JournalEntryDraft,
  JournalTradeRuleResult,
  JournalTradeViewModel,
} from "@/domain/journal-types";

export interface JournalAutoRuleFlag {
  id: string;
  label: string;
  reason: string;
  source: "global" | "strategy" | "setup" | "system";
  status: "followed" | "broken";
  matchTerms: string[];
}

export interface JournalRuleIntelligence {
  flags: JournalAutoRuleFlag[];
  suggestedResults: JournalTradeRuleResult[];
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeRules(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function createFlag(
  id: string,
  label: string,
  reason: string,
  source: JournalAutoRuleFlag["source"],
  status: JournalAutoRuleFlag["status"],
  matchTerms: string[],
): JournalAutoRuleFlag {
  return { id, label, reason, source, status, matchTerms };
}

function sameEstDate(left: Date, right: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(left) === formatter.format(right);
}

function getTradeDayMetrics(trade: Trade, allTrades: Trade[]) {
  const anchor = new Date(trade.exitDate ?? trade.entryDate);
  const sameDayTrades = allTrades.filter((candidate) => {
    if ((candidate.propAccountId ?? null) !== (trade.propAccountId ?? null)) {
      return false;
    }
    const candidateTime = new Date(candidate.exitDate ?? candidate.entryDate);
    return sameEstDate(anchor, candidateTime);
  });

  return {
    totalTrades: sameDayTrades.length,
    totalPnl: sameDayTrades.reduce(
      (sum, candidate) => sum + getTradeNetPnl(candidate),
      0,
    ),
    lossTrades: sameDayTrades.filter((candidate) => getTradeNetPnl(candidate) < 0)
      .length,
  };
}

function parseTradeLimit(rule: string) {
  const match =
    /(?:no more than|max(?:imum)?|limit(?:ed)? to)\s+(\d+)\s+trade/i.exec(rule) ??
    /(\d+)\s+trade(?:s)?\s+max/i.exec(rule);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseDailyLossLimit(rule: string) {
  const match =
    /(?:daily loss|loss limit|max(?:imum)? loss)[^\d$]*\$?\s*(\d+(?:\.\d+)?)/i.exec(
      rule,
    ) ??
    /stop(?:ping)? loss[^\d$]*\$?\s*(\d+(?:\.\d+)?)/i.exec(rule);
  return match ? Number.parseFloat(match[1]) : null;
}

function parseLossCountLimit(rule: string) {
  const match = /stop after\s+(\d+)\s+loss/i.exec(rule);
  return match ? Number.parseInt(match[1], 10) : null;
}

function buildSourceFlags(
  source: JournalAutoRuleFlag["source"],
  rules: string[],
  metrics: ReturnType<typeof getTradeDayMetrics>,
): JournalAutoRuleFlag[] {
  const flags: JournalAutoRuleFlag[] = [];

  for (const rule of rules) {
    const trimmed = rule.trim();
    if (!trimmed) continue;

    const tradeLimit = parseTradeLimit(trimmed);
    if (tradeLimit != null) {
      flags.push(
        createFlag(
          `${source}-trade-limit-${tradeLimit}`,
          `Max ${tradeLimit} trades`,
          metrics.totalTrades > tradeLimit
            ? `Logged ${metrics.totalTrades} trades on the day.`
            : `Stayed within ${tradeLimit} trades on the day.`,
          source,
          metrics.totalTrades > tradeLimit ? "broken" : "followed",
          ["trade", "trades", "max trades", "trade limit"],
        ),
      );
    }

    const dailyLossLimit = parseDailyLossLimit(trimmed);
    if (dailyLossLimit != null) {
      const breached =
        metrics.totalPnl < 0 && Math.abs(metrics.totalPnl) > dailyLossLimit;
      flags.push(
        createFlag(
          `${source}-daily-loss-${dailyLossLimit}`,
          `Daily loss ${dailyLossLimit}`,
          breached
            ? `Day closed at ${metrics.totalPnl.toFixed(2)}.`
            : `Day stayed inside the ${dailyLossLimit.toFixed(2)} limit.`,
          source,
          breached ? "broken" : "followed",
          ["daily loss", "loss limit", "drawdown", "max loss"],
        ),
      );
    }

    const lossCountLimit = parseLossCountLimit(trimmed);
    if (lossCountLimit != null) {
      flags.push(
        createFlag(
          `${source}-loss-count-${lossCountLimit}`,
          `Stop after ${lossCountLimit} losses`,
          metrics.lossTrades > lossCountLimit
            ? `${metrics.lossTrades} losing trades were logged on the day.`
            : `${metrics.lossTrades} losing trades were logged on the day.`,
          source,
          metrics.lossTrades > lossCountLimit ? "broken" : "followed",
          ["loss", "losses", "revenge", "daily stop"],
        ),
      );
    }
  }

  return flags;
}

function buildSetupFlags(
  viewModel: JournalTradeViewModel,
  draft: JournalEntryDraft,
  selectedSetup: SetupDefinition | null,
) {
  if (!selectedSetup) {
    return [] as JournalAutoRuleFlag[];
  }

  const flags: JournalAutoRuleFlag[] = [];
  const currentSession = normalize(viewModel.session);
  const preferredSession = normalize(selectedSetup.preferredSession);
  if (preferredSession) {
    const matches = currentSession === preferredSession;
    flags.push(
      createFlag(
        `setup-session-${selectedSetup.id}`,
        `Session fit: ${selectedSetup.preferredSession}`,
        matches
          ? `Trade session matched ${selectedSetup.preferredSession}.`
          : `Trade session was ${viewModel.session ?? "Unknown"}.`,
        "setup",
        matches ? "followed" : "broken",
        ["session", "session fit", "session only"],
      ),
    );
  }

  const preferredCondition = normalize(selectedSetup.preferredMarketCondition);
  if (preferredCondition && draft.marketCondition) {
    const matches = normalize(draft.marketCondition) === preferredCondition;
    flags.push(
      createFlag(
        `setup-market-${selectedSetup.id}`,
        `Market fit: ${selectedSetup.preferredMarketCondition}`,
        matches
          ? `Market condition matched ${selectedSetup.preferredMarketCondition}.`
          : `Selected market condition was ${draft.marketCondition}.`,
        "setup",
        matches ? "followed" : "broken",
        ["market", "volatility", "condition", "regime"],
      ),
    );
  }

  const entryCriteria = normalizeRules(selectedSetup.entryCriteria);
  if (entryCriteria.length > 0) {
    const checklist = new Set(
      draft.executionArrays.map((item) => normalize(item)),
    );
    const missing = entryCriteria.filter(
      (criterion) => !checklist.has(normalize(criterion)),
    );

    flags.push(
      createFlag(
        `setup-entry-${selectedSetup.id}`,
        "Entry checklist",
        missing.length > 0
          ? `Missing ${missing.length} setup criteria from the execution checklist.`
          : "Execution checklist covered the saved setup criteria.",
        "setup",
        missing.length > 0 ? "broken" : "followed",
        ["entry", "criteria", "checklist", "setup"],
      ),
    );
  }

  return flags;
}

function matchTerms(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function buildJournalRuleIntelligence({
  draft,
  activeTrade,
  allTrades,
  viewModel,
  selectedPlaybook,
  selectedSetup,
  effectiveRuleSet,
  globalRules,
}: {
  draft: JournalEntryDraft;
  activeTrade: Trade;
  allTrades: Trade[];
  viewModel: JournalTradeViewModel;
  selectedPlaybook: Playbook | null;
  selectedSetup: SetupDefinition | null;
  effectiveRuleSet: RuleSetWithItems | null;
  globalRules: string[];
}): JournalRuleIntelligence {
  const metrics = getTradeDayMetrics(activeTrade, allTrades);
  const flags = [
    ...buildSourceFlags("global", normalizeRules(globalRules), metrics),
    ...buildSourceFlags(
      "strategy",
      normalizeRules(selectedPlaybook?.rules),
      metrics,
    ),
    ...buildSetupFlags(viewModel, draft, selectedSetup),
  ];

  const byLabel = new Map<string, JournalAutoRuleFlag>();
  for (const flag of flags) {
    if (!byLabel.has(flag.label)) {
      byLabel.set(flag.label, flag);
    }
  }
  const dedupedFlags = [...byLabel.values()];

  const suggestedResults: JournalTradeRuleResult[] =
    effectiveRuleSet?.items.flatMap((item) => {
      const haystack = normalize(
        `${item.title} ${item.description ?? ""} ${item.category ?? ""}`,
      );
      const matchingFlags = dedupedFlags.filter((flag) =>
        matchTerms(haystack, flag.matchTerms),
      );

      if (matchingFlags.some((flag) => flag.status === "broken")) {
        return [
          {
            ruleItemId: item.id,
            title: item.title,
            category: item.category ?? null,
            severity: item.severity ?? null,
            status: "broken" as RuleItemStatus,
          },
        ];
      }

      if (matchingFlags.some((flag) => flag.status === "followed")) {
        return [
          {
            ruleItemId: item.id,
            title: item.title,
            category: item.category ?? null,
            severity: item.severity ?? null,
            status: "followed" as RuleItemStatus,
          },
        ];
      }

      if (
        haystack.includes("screenshot") &&
        draft.screenshots.length > 0
      ) {
        return [
          {
            ruleItemId: item.id,
            title: item.title,
            category: item.category ?? null,
            severity: item.severity ?? null,
            status: "followed" as RuleItemStatus,
          },
        ];
      }

      return [];
    }) ?? [];

  return {
    flags: dedupedFlags,
    suggestedResults,
  };
}
