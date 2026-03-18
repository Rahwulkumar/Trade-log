import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { parseNoteCreatePayload } from '@/lib/validation/notes';

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

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const rows = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));

  return NextResponse.json(rows.map(toNoteRow));
}

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parseNoteCreatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Invalid note payload',
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  const title = result.data.title?.trim() || 'Untitled';
  const icon = result.data.icon?.trim() || '📝';

  const [row] = await db
    .insert(notes)
    .values({
      userId,
      title,
      icon,
    })
    .returning();

  if (!row) return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  return NextResponse.json(toNoteRow(row), { status: 201 });
}
