import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { duplicatePlaybook } from '@/lib/api/playbooks';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const playbook = await duplicatePlaybook(id, userId);
    return NextResponse.json(playbook);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to duplicate playbook';
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
