import { requireAuth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { createPlaybook, getActivePlaybooks, getPlaybooks } from '@/lib/api/playbooks';
import { parsePlaybookCreatePayload } from '@/lib/validation/playbooks';

export async function GET(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  const playbooks = activeOnly
    ? await getActivePlaybooks(userId)
    : await getPlaybooks(userId);

  return NextResponse.json(playbooks);
}

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parsePlaybookCreatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Invalid playbook payload',
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const playbook = await createPlaybook(userId, result.data);
    return NextResponse.json(playbook, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create playbook';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
