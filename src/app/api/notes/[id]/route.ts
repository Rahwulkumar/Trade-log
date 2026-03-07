import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

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

/** PATCH /api/notes/[id] — Update a note (title, content, icon, pinned, tags) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const updates: Partial<typeof notes.$inferInsert> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (typeof body.pinned === 'boolean') updates.pinned = body.pinned;
  if (Array.isArray(body.tags)) updates.tags = body.tags;

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

/** DELETE /api/notes/[id] */
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
