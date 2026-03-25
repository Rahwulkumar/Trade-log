import { NextRequest } from 'next/server';

import { apiError, apiSuccess, apiValidationError } from '@/lib/api/http';
import { requireAuth } from '@/lib/auth/server';
import { buildTradeReport } from '@/lib/reports/build-report';
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
    const report = await buildTradeReport(userId, {
      title: result.data.title ?? null,
      reportType: result.data.reportType,
      accountScope: result.data.accountScope,
      propAccountId: result.data.propAccountId ?? null,
      from: result.data.from ?? null,
      to: result.data.to ?? null,
      includeAi: result.data.includeAi ?? false,
      symbol: result.data.symbol ?? null,
      playbookId: result.data.playbookId ?? null,
    });

    return apiSuccess({ report });
  } catch (routeError) {
    return apiError(
      500,
      routeError instanceof Error ? routeError.message : 'Failed to generate report',
    );
  }
}
