import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import {
  deletePlaybook,
  getPlaybook,
  updatePlaybook,
} from '@/lib/api/playbooks';
import { parsePlaybookUpdatePayload } from '@/lib/validation/playbooks';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const playbook = await getPlaybook(id, userId);

  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
  }

  return NextResponse.json(playbook);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = parsePlaybookUpdatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Invalid playbook update payload',
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (Object.keys(result.data).length === 0) {
    return NextResponse.json(
      { error: 'At least one field must be provided' },
      { status: 400 },
    );
  }

  try {
    const playbook = await updatePlaybook(id, userId, result.data);
    return NextResponse.json(playbook);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update playbook';
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    await deletePlaybook(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete playbook';
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
