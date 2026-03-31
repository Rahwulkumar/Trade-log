import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import {
  createJournalTemplate,
  getJournalTemplates,
} from "@/lib/api/journal-structure";
import { parseJournalTemplateCreatePayload } from "@/lib/validation/journal-structure";

export async function GET(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const rows = await getJournalTemplates(userId, { activeOnly });
    return NextResponse.json(rows);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load templates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parseJournalTemplateCreatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid template payload",
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const template = await createJournalTemplate(userId, result.data);
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
