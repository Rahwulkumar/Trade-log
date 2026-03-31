import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import {
  createMistakeDefinition,
  getMistakeDefinitions,
} from "@/lib/api/journal-structure";
import { parseMistakeDefinitionCreatePayload } from "@/lib/validation/journal-structure";

export async function GET(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const rows = await getMistakeDefinitions(userId, { activeOnly });
    return NextResponse.json(rows);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load mistakes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parseMistakeDefinitionCreatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid mistake payload",
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const mistake = await createMistakeDefinition(userId, result.data);
    return NextResponse.json(mistake, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create mistake";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
