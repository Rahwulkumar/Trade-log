import type { RuleSet, RuleSetItem } from "@/lib/db/schema";

export const RULE_SET_SCOPE_TYPES = [
  "global",
  "account",
  "playbook",
  "setup",
  "template",
] as const;

export type RuleSetScopeType = (typeof RULE_SET_SCOPE_TYPES)[number];

export const RULE_ITEM_STATUSES = [
  "followed",
  "broken",
  "skipped",
  "notApplicable",
] as const;

export type RuleItemStatus = (typeof RULE_ITEM_STATUSES)[number];

export interface TradeRuleResult {
  ruleItemId: string;
  title: string;
  category: string | null;
  severity: string | null;
  status: RuleItemStatus;
}

export interface RuleSetWithItems extends RuleSet {
  items: RuleSetItem[];
}
