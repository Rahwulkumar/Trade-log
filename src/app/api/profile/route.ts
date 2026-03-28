import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import {
  getOrCreateCurrentAppUserProfile,
  updateCurrentAppUserProfile,
} from '@/lib/api/app-users';

const updateProfileSchema = z.object({
  first_name: z.string().trim().max(80).nullable().optional(),
  last_name: z.string().trim().max(80).nullable().optional(),
  timezone: z.enum(['utc-4', 'utc', 'est', 'pst', 'ist']).nullable().optional(),
  default_risk_percent: z.number().finite().min(0).max(100).nullable().optional(),
  default_rr_ratio: z.number().finite().min(0).max(100).nullable().optional(),
  default_timeframe: z.enum(['m15', 'm30', 'h1', 'h4', 'd1']).nullable().optional(),
  trading_rules: z.array(z.string().trim().max(300)).max(100).optional(),
});

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const profile = await getOrCreateCurrentAppUserProfile();
    return NextResponse.json(profile);
  } catch (routeError) {
    const message =
      routeError instanceof Error ? routeError.message : 'Failed to load profile';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Invalid profile payload',
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const profile = await updateCurrentAppUserProfile(result.data);
    return NextResponse.json(profile);
  } catch (routeError) {
    const message =
      routeError instanceof Error ? routeError.message : 'Failed to update profile';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
