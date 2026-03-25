import type { SavedReport } from '@/lib/db/schema';
import type {
  SavedReportListItem,
  SavedReportRecord,
  TradeReportSnapshot,
} from '@/lib/reports/types';

function toDateString(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

export function mapSavedReportToListItem(row: SavedReport): SavedReportListItem {
  return {
    id: row.id,
    title: row.title,
    reportType: row.reportType as SavedReportListItem['reportType'],
    accountScope: row.accountScope as SavedReportListItem['accountScope'],
    propAccountId: row.propAccountId ?? null,
    from: toDateString(row.fromDate),
    to: toDateString(row.toDate),
    includeAi: row.includeAi,
    tradeCount: row.tradeCount,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

export function mapSavedReportToRecord(row: SavedReport): SavedReportRecord {
  return {
    ...mapSavedReportToListItem(row),
    selectedTradeIds: Array.isArray(row.selectedTradeIds) ? row.selectedTradeIds : [],
    snapshot: row.snapshot as unknown as TradeReportSnapshot,
  };
}
