import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { savedReports } from '@/lib/db/schema';
import { mapSavedReportToListItem, mapSavedReportToRecord } from '@/lib/reports/serializers';
import type {
  ReportSnapshot,
  SavedReportListItem,
  SavedReportRecord,
} from '@/lib/reports/types';

export async function getSavedReports(userId: string): Promise<SavedReportListItem[]> {
  const rows = await db
    .select()
    .from(savedReports)
    .where(eq(savedReports.userId, userId))
    .orderBy(desc(savedReports.createdAt));

  return rows.map(mapSavedReportToListItem);
}

export async function getSavedReport(
  id: string,
  userId: string,
): Promise<SavedReportRecord | null> {
  const [row] = await db
    .select()
    .from(savedReports)
    .where(and(eq(savedReports.id, id), eq(savedReports.userId, userId)))
    .limit(1);

  return row ? mapSavedReportToRecord(row) : null;
}

export async function createSavedReport(
  userId: string,
  payload: {
    title: string;
    snapshot: ReportSnapshot;
  },
): Promise<SavedReportRecord> {
  const [row] = await db
    .insert(savedReports)
    .values({
      userId,
      title: payload.title,
      reportType: payload.snapshot.reportType,
      accountScope: payload.snapshot.filters.accountScope,
      propAccountId:
        payload.snapshot.filters.accountScope === 'account'
          ? payload.snapshot.filters.propAccountId
          : null,
      fromDate: payload.snapshot.filters.from,
      toDate: payload.snapshot.filters.to,
      includeAi: payload.snapshot.filters.includeAi,
      tradeCount:
        "workspace" in payload.snapshot
          ? payload.snapshot.workspace.totals.filteredTrades
          : payload.snapshot.summary.totalTrades,
      selectedTradeIds:
        "workspace" in payload.snapshot
          ? []
          : payload.snapshot.selectedTradeIds,
      snapshot: payload.snapshot as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .returning();

  return mapSavedReportToRecord(row);
}

export async function deleteSavedReport(
  id: string,
  userId: string,
): Promise<void> {
  await db
    .delete(savedReports)
    .where(and(eq(savedReports.id, id), eq(savedReports.userId, userId)));
}
