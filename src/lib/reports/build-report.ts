import 'server-only';

import { and, asc, eq, gte, ilike, isNull, lte } from 'drizzle-orm';

import { db } from '@/lib/db';
import { playbooks, propAccounts, trades } from '@/lib/db/schema';
import { buildVisibleTradeAccountCondition } from '@/lib/prop-accounts/status';
import { deriveTradeReportSnapshot, type TradeReportInput } from '@/lib/reports/derive-trade-report';
import { generateReportAiCommentary } from '@/lib/reports/gemini-report';
import type { ReportFilters, TradeReportSnapshot } from '@/lib/reports/types';

function parseDateStart(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateEnd(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function buildTradeReport(
  userId: string,
  filters: ReportFilters,
): Promise<TradeReportSnapshot> {
  const conditions = [
    eq(trades.userId, userId),
    eq(trades.status, 'CLOSED'),
    buildVisibleTradeAccountCondition(),
  ];

  if (filters.accountScope === 'unassigned') {
    conditions.push(isNull(trades.propAccountId));
  } else if (filters.accountScope === 'account' && filters.propAccountId) {
    conditions.push(eq(trades.propAccountId, filters.propAccountId));
  }

  if (filters.playbookId) {
    conditions.push(eq(trades.playbookId, filters.playbookId));
  }

  if (filters.symbol) {
    conditions.push(ilike(trades.symbol, `%${filters.symbol}%`));
  }

  const fromDate = parseDateStart(filters.from);
  const toDate = parseDateEnd(filters.to);

  if (fromDate) {
    conditions.push(gte(trades.exitDate, fromDate));
  }

  if (toDate) {
    conditions.push(lte(trades.exitDate, toDate));
  }

  const rows = await db
    .select({
      id: trades.id,
      symbol: trades.symbol,
      direction: trades.direction,
      pnl: trades.pnl,
      pnlIncludesCosts: trades.pnlIncludesCosts,
      commission: trades.commission,
      swap: trades.swap,
      rMultiple: trades.rMultiple,
      mae: trades.mae,
      mfe: trades.mfe,
      entryDate: trades.entryDate,
      exitDate: trades.exitDate,
      session: trades.session,
      playbookId: trades.playbookId,
      playbookName: playbooks.name,
      positionSize: trades.positionSize,
      stopLoss: trades.stopLoss,
      entryPrice: trades.entryPrice,
      conviction: trades.conviction,
      entryRating: trades.entryRating,
      exitRating: trades.exitRating,
      managementRating: trades.managementRating,
      lessonLearned: trades.lessonLearned,
      wouldTakeAgain: trades.wouldTakeAgain,
      setupTags: trades.setupTags,
      mistakeTags: trades.mistakeTags,
      notes: trades.notes,
      feelings: trades.feelings,
      observations: trades.observations,
    })
    .from(trades)
    .leftJoin(propAccounts, eq(trades.propAccountId, propAccounts.id))
    .leftJoin(playbooks, eq(trades.playbookId, playbooks.id))
    .where(and(...conditions))
    .orderBy(asc(trades.exitDate), asc(trades.entryDate));

  const snapshot = deriveTradeReportSnapshot(rows as TradeReportInput[], filters);

  if (!filters.includeAi || snapshot.summary.totalTrades === 0) {
    return snapshot;
  }

  try {
    const aiCommentary = await generateReportAiCommentary(snapshot);
    return {
      ...snapshot,
      aiCommentary,
      aiError: null,
    };
  } catch (error) {
    return {
      ...snapshot,
      aiCommentary: null,
      aiError:
        error instanceof Error
          ? error.message
          : 'AI commentary could not be generated.',
    };
  }
}
