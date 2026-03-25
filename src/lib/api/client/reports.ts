import { readJsonIfAvailable } from '@/lib/api/client/http';
import type {
  ReportFilters,
  SavedReportListItem,
  SavedReportRecord,
  TradeReportSnapshot,
} from '@/lib/reports/types';

interface ApiSuccessPayload<T> {
  success: boolean;
  error?: string;
  report?: T;
  reports?: T;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error;
  }

  return fallback;
}

export async function generateReport(
  filters: ReportFilters,
): Promise<TradeReportSnapshot> {
  const response = await fetch('/api/reports/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });

  const payload = await readJsonIfAvailable<ApiSuccessPayload<TradeReportSnapshot>>(response);
  if (!response.ok || !payload?.success || !payload.report) {
    throw new Error(getErrorMessage(payload, 'Failed to generate report'));
  }

  return payload.report;
}

export async function getSavedReports(): Promise<SavedReportListItem[]> {
  const response = await fetch('/api/reports');
  const payload = await readJsonIfAvailable<ApiSuccessPayload<SavedReportListItem[]>>(response);
  if (!response.ok || !payload?.success || !payload.reports) {
    throw new Error(getErrorMessage(payload, 'Failed to load saved reports'));
  }

  return payload.reports;
}

export async function getSavedReport(id: string): Promise<SavedReportRecord> {
  const response = await fetch(`/api/reports/${id}`);
  const payload = await readJsonIfAvailable<ApiSuccessPayload<SavedReportRecord>>(response);
  if (!response.ok || !payload?.success || !payload.report) {
    throw new Error(getErrorMessage(payload, 'Failed to load report'));
  }

  return payload.report;
}

export async function saveReport(
  title: string,
  snapshot: TradeReportSnapshot,
): Promise<SavedReportRecord> {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, snapshot }),
  });

  const payload = await readJsonIfAvailable<ApiSuccessPayload<SavedReportRecord>>(response);
  if (!response.ok || !payload?.success || !payload.report) {
    throw new Error(getErrorMessage(payload, 'Failed to save report'));
  }

  return payload.report;
}

export async function deleteReport(id: string): Promise<void> {
  const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
  const payload = await readJsonIfAvailable<ApiSuccessPayload<never>>(response);
  if (!response.ok || !payload?.success) {
    throw new Error(getErrorMessage(payload, 'Failed to delete report'));
  }
}
