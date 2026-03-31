import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import {
  deleteSetupDefinition,
  getSetupDefinition,
  updateSetupDefinition,
} from "@/lib/api/journal-structure";
import { parseSetupDefinitionUpdatePayload } from "@/lib/validation/journal-structure";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const setup = await getSetupDefinition(id, userId);
    if (!setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    return NextResponse.json(setup);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load setup";
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
  const result = parseSetupDefinitionUpdatePayload(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid setup update payload",
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
    const setup = await updateSetupDefinition(id, userId, result.data);
    return NextResponse.json(setup);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update setup";
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
    await deleteSetupDefinition(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete setup";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
