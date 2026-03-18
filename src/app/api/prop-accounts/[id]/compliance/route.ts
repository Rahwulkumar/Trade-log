import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { apiError } from '@/lib/api/http';
import { checkCompliance } from '@/lib/api/prop-accounts';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const result = await checkCompliance(id, userId);
    return NextResponse.json(result);
  } catch (routeError) {
    console.error('[compliance route] Error:', routeError);
    const message =
      routeError instanceof Error ? routeError.message : 'Failed to calculate compliance';
    const status = message.toLowerCase().includes('not found') ? 404 : 500;
    return apiError(status, message);
  }
}
