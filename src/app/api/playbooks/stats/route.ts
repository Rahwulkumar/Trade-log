import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getAllPlaybooksWithStats } from '@/lib/api/playbooks';

export async function GET(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const propAccountId = searchParams.get('propAccountId');

    const stats = await getAllPlaybooksWithStats(userId, propAccountId);
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load playbook stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
