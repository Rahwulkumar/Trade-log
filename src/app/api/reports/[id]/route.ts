import { NextRequest } from 'next/server';

import { deleteSavedReport, getSavedReport } from '@/lib/api/reports';
import { apiError, apiSuccess } from '@/lib/api/http';
import { requireAuth } from '@/lib/auth/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;

  try {
    const report = await getSavedReport(id, userId);
    if (!report) {
      return apiError(404, 'Report not found');
    }
    return apiSuccess({ report });
  } catch (routeError) {
    return apiError(
      500,
      routeError instanceof Error ? routeError.message : 'Failed to load report',
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;

  try {
    await deleteSavedReport(id, userId);
    return apiSuccess();
  } catch (routeError) {
    return apiError(
      400,
      routeError instanceof Error ? routeError.message : 'Failed to delete report',
    );
  }
}
