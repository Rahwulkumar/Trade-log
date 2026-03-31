import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import {
  deleteMistakeDefinition,
  getMistakeDefinition,
  updateMistakeDefinition,
} from "@/lib/api/journal-structure";
import { parseMistakeDefinitionUpdatePayload } from "@/lib/validation/journal-structure";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const mistake = await getMistakeDefinition(id, userId);
    if (!mistake) {
      return NextResponse.json({ error: "Mistake not found" }, { status: 404 });
    }

    return NextResponse.json(mistake);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load mistake";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = parseMistakeDefinitionUpdatePayload(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid mistake update payload",
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (Object.keys(result.data).length === 0) {
    return NextResponse.json(
      { error: "At least one field must be provided" },
      { status: 400 },
    );
  }

  try {
    const mistake = await updateMistakeDefinition(id, userId, result.data);
    return NextResponse.json(mistake);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update mistake";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    await deleteMistakeDefinition(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete mistake";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
