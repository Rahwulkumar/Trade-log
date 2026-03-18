import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { parseNoteUpdatePayload } from '@/lib/validation/notes';

function toNoteRow(row: typeof notes.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    icon: row.icon,
    pinned: row.pinned,
    tags: row.tags ?? [],
    created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updated_at: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = parseNoteUpdatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Invalid note update payload',
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  const updates: Partial<typeof notes.$inferInsert> = {};
  if (result.data.title !== undefined) updates.title = result.data.title ?? 'Untitled';
  if (result.data.content !== undefined) updates.content = result.data.content;
  if (result.data.icon !== undefined) updates.icon = result.data.icon ?? '📝';
  if (result.data.pinned !== undefined) updates.pinned = result.data.pinned;
  if (result.data.tags !== undefined) updates.tags = result.data.tags;

  if (Object.keys(updates).length === 0) {
    const [existing] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(toNoteRow(existing));
  }

  updates.updatedAt = new Date();

  const [row] = await db
    .update(notes)
    .set(updates)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning();

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(toNoteRow(row));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const [deleted] = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning({ id: notes.id });

  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
