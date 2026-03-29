import { NextRequest } from 'next/server';

import { getAnalyticsWorkspaceResult } from '@/lib/analytics/query';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/http';
import { requireAuth } from '@/lib/auth/server';
import {
  buildAnalyticsWorkspaceQueryFromReportFilters,
  createWorkspaceReportSnapshot,
  getDefaultReportQuerySettings,
} from '@/lib/reports/workspace-report';
import { parseReportGeneratePayload } from '@/lib/validation/reports';

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parseReportGeneratePayload(body);
  if (!result.success) {
    return apiValidationError('Invalid report generation payload', result.error.flatten());
  }

  try {
    const filters = {
      title: result.data.title ?? null,
      reportType: result.data.reportType,
      accountScope: result.data.accountScope,
      propAccountId: result.data.propAccountId ?? null,
      from: result.data.from ?? null,
      to: result.data.to ?? null,
      includeAi: false,
      groupBy:
        result.data.groupBy ??
        getDefaultReportQuerySettings(result.data.reportType).groupBy,
      measure:
        result.data.measure ??
        getDefaultReportQuerySettings(result.data.reportType).measure,
      sortOrder: result.data.sortOrder ?? 'desc',
      limit: result.data.limit ?? 24,
      timeZone: result.data.timeZone ?? null,
      symbol: result.data.symbol ?? null,
      session: result.data.session ?? null,
      playbookId: result.data.playbookId ?? null,
      setupTag: result.data.setupTag ?? null,
      mistakeTag: result.data.mistakeTag ?? null,
      direction: result.data.direction ?? null,
      reviewStatus: result.data.reviewStatus ?? null,
    } as const;

    const workspace = await getAnalyticsWorkspaceResult(
      userId,
      buildAnalyticsWorkspaceQueryFromReportFilters(filters),
    );

    const report = createWorkspaceReportSnapshot(filters, workspace);

    return apiSuccess({ report });
  } catch (routeError) {
    return apiError(
      500,
      routeError instanceof Error ? routeError.message : 'Failed to generate report',
    );
  }
}
