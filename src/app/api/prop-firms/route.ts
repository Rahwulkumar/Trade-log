import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getPropFirmsActive } from '@/lib/api/prop-firms-server';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  try {
    const rows = await getPropFirmsActive();
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        website: r.website,
        logo_url: r.logoUrl,
        is_active: r.isActive ?? true,
        created_at: r.createdAt,
      }))
    );
  } catch (e) {
    console.error('[GET /api/prop-firms]', e);
    return NextResponse.json({ error: 'Failed to fetch firms' }, { status: 500 });
  }
}
