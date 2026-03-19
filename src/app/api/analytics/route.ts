import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUserId } from '@/lib/auth/server';
import {
  getAnalyticsPayload,
  normalizeAnalyticsAccountScope,
} from '@/lib/analytics/data';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountScope = normalizeAnalyticsAccountScope(
    request.nextUrl.searchParams.get('account'),
  );

  const payload = await getAnalyticsPayload(userId, {
    accountScope,
    from: request.nextUrl.searchParams.get('from'),
    to: request.nextUrl.searchParams.get('to'),
    timeZone: request.nextUrl.searchParams.get('timezone'),
  });

  return NextResponse.json(payload);
}
