import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { seedPropFirmsIfEmpty } from '@/lib/api/prop-firms-server';

/** POST /api/seed/prop-firms — Idempotent seed for prop firms and challenges (FTMO, Apex, Topstep). */
export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;
  try {
    const { inserted } = await seedPropFirmsIfEmpty();
    return NextResponse.json({ ok: true, inserted });
  } catch (e) {
    console.error('[seed/prop-firms]', e);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
