import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import {
  deletePlaybook,
  getPlaybook,
  updatePlaybook,
} from '@/lib/api/playbooks';

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
  const body = await request.json();

  try {
    const playbook = await updatePlaybook(id, userId, body);
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
