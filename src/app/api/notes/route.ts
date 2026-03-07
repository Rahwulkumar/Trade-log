import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/** Map Drizzle row to snake_case for notebook frontend */
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

/** GET /api/notes — List current user's notes (pinned first, then by updated_at desc) */
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

/** POST /api/notes — Create a note */
export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string) ?? 'Untitled';
  const icon = (body.icon as string) ?? '📝';

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
