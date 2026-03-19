import 'server-only';

import { and, asc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';

import { computeAnalytics } from '@/lib/analytics/compute';
import type {
  AnalyticsAccountScope,
  AnalyticsPayload,
  AnalyticsTradeInput,
} from '@/lib/analytics/types';
import { db } from '@/lib/db';
import {
  appUsers,
  playbooks,
  propAccounts,
  propFirmChallenges,
  trades,
} from '@/lib/db/schema';

export interface AnalyticsFilters {
  accountScope: AnalyticsAccountScope;
  from?: string | null;
  to?: string | null;
  timeZone?: string | null;
}

function normalizeTimeZone(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    return null;
  }
}

function parseDateStart(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeAnalyticsAccountScope(
  value: string | null | undefined,
): AnalyticsAccountScope {
  const normalized = value?.trim();
  if (!normalized || normalized === 'all') return 'all';
  if (normalized === 'unassigned') return 'unassigned';
  return normalized;
}

export async function getAnalyticsPayload(
  userId: string,
  filters: AnalyticsFilters,
): Promise<AnalyticsPayload> {
  const conditions = [
    eq(trades.userId, userId),
    eq(trades.status, 'CLOSED'),
  ];

  if (filters.accountScope === 'unassigned') {
    conditions.push(isNull(trades.propAccountId));
  } else if (filters.accountScope !== 'all') {
    conditions.push(eq(trades.propAccountId, filters.accountScope));
  }

  const fromDate = parseDateStart(filters.from);
  const toDate = parseDateEnd(filters.to);
  if (fromDate) {
    conditions.push(gte(trades.exitDate, fromDate));
  }
  if (toDate) {
    conditions.push(lte(trades.exitDate, toDate));
  }

  const userPrefsPromise = db
    .select({
      timezone: appUsers.timezone,
      defaultRiskPercent: appUsers.defaultRiskPercent,
    })
    .from(appUsers)
    .where(eq(appUsers.id, userId))
    .limit(1);

  const rowsPromise = db
    .select({
      id: trades.id,
      symbol: trades.symbol,
      propAccountId: trades.propAccountId,
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
      positionSize: trades.positionSize,
      stopLoss: trades.stopLoss,
      entryPrice: trades.entryPrice,
      contractSize: trades.contractSize,
      mt5AccountId: trades.mt5AccountId,
      playbookId: trades.playbookId,
      playbookName: playbooks.name,
    })
    .from(trades)
    .leftJoin(playbooks, eq(trades.playbookId, playbooks.id))
    .where(and(...conditions))
    .orderBy(asc(trades.exitDate), asc(trades.entryDate));

  let userPrefsRows;
  let rows;

  if (filters.accountScope !== 'all' && filters.accountScope !== 'unassigned') {
    const accountMetaPromise = db
      .select({
        accountName: propAccounts.accountName,
        accountSize: propAccounts.accountSize,
        initialBalance: propFirmChallenges.initialBalance,
        maxLossPercent: propFirmChallenges.maxLossPercent,
      })
      .from(propAccounts)
      .leftJoin(propFirmChallenges, eq(propAccounts.challengeId, propFirmChallenges.id))
      .where(and(eq(propAccounts.userId, userId), eq(propAccounts.id, filters.accountScope)))
      .limit(1);

    const [resolvedUserPrefs, resolvedRows, accountMetaRows] = await Promise.all([
      userPrefsPromise,
      rowsPromise,
      accountMetaPromise,
    ]);

    userPrefsRows = resolvedUserPrefs;
    rows = resolvedRows;

    const tradeRows: AnalyticsTradeInput[] = rows.map((row) => ({
      ...row,
      pnlIncludesCosts: row.pnlIncludesCosts ?? true,
    }));

    const accountMeta = accountMetaRows[0];
    const accountLabel = accountMeta?.accountName ?? 'Selected Account';
    const startingBalance =
      Number(accountMeta?.initialBalance ?? accountMeta?.accountSize ?? 0) || 0;
    const maxLossPercent =
      accountMeta?.maxLossPercent != null
        ? Number(accountMeta.maxLossPercent)
        : null;

    const timeZone =
      normalizeTimeZone(filters.timeZone) ??
      normalizeTimeZone(userPrefsRows[0]?.timezone) ??
      'UTC';

    return computeAnalytics(tradeRows, {
      accountScope: filters.accountScope,
      accountLabel,
      startingBalance,
      timeZone,
      defaultRiskPercent:
        userPrefsRows[0]?.defaultRiskPercent != null
          ? Number(userPrefsRows[0].defaultRiskPercent)
          : null,
      maxLossPercent,
    });
  }

  [userPrefsRows, rows] = await Promise.all([userPrefsPromise, rowsPromise]);
  const userPrefs = userPrefsRows[0];

  const tradeRows: AnalyticsTradeInput[] = rows.map((row) => ({
    ...row,
    pnlIncludesCosts: row.pnlIncludesCosts ?? true,
  }));

  const linkedAccountIds = [...new Set(tradeRows.map((row) => row.propAccountId).filter(Boolean))];

  let accountLabel = 'All Accounts';
  let startingBalance = 0;
  const maxLossPercent: number | null = null;

  if (filters.accountScope === 'unassigned') {
    accountLabel = 'Unassigned';
  } else if (linkedAccountIds.length > 0) {
    const accountRows = await db
      .select({
        accountSize: propAccounts.accountSize,
        initialBalance: propFirmChallenges.initialBalance,
      })
      .from(propAccounts)
      .leftJoin(propFirmChallenges, eq(propAccounts.challengeId, propFirmChallenges.id))
      .where(
        and(
          eq(propAccounts.userId, userId),
          inArray(propAccounts.id, linkedAccountIds as string[]),
        ),
      );

    startingBalance = accountRows.reduce((sum, row) => {
      return sum + (Number(row.initialBalance ?? row.accountSize ?? 0) || 0);
    }, 0);
  }

  const timeZone =
    normalizeTimeZone(filters.timeZone) ??
    normalizeTimeZone(userPrefs?.timezone) ??
    'UTC';

  return computeAnalytics(tradeRows, {
    accountScope: filters.accountScope,
    accountLabel,
    startingBalance,
    timeZone,
    defaultRiskPercent:
      userPrefs?.defaultRiskPercent != null
        ? Number(userPrefs.defaultRiskPercent)
        : null,
    maxLossPercent,
  });
}
