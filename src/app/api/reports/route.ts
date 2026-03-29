import { NextRequest } from 'next/server';

import { createSavedReport, getSavedReports } from '@/lib/api/reports';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/http';
import { requireAuth } from '@/lib/auth/server';
import type { ReportSnapshot } from '@/lib/reports/types';
import { parseReportSavePayload } from '@/lib/validation/reports';

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const reports = await getSavedReports(userId);
    return apiSuccess({ reports });
  } catch (routeError) {
    return apiError(
      500,
      routeError instanceof Error ? routeError.message : 'Failed to load reports',
    );
  }
}

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parseReportSavePayload(body);
  if (!result.success) {
    return apiValidationError('Invalid report payload', result.error.flatten());
  }

  try {
    const report = await createSavedReport(userId, {
      title: result.data.title,
      snapshot: result.data.snapshot as unknown as ReportSnapshot,
    });
    return apiSuccess({ report });
  } catch (routeError) {
    return apiError(
      400,
      routeError instanceof Error ? routeError.message : 'Failed to save report',
    );
  }
}
