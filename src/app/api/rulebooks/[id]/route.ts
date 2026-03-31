import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import {
  deleteRuleSet,
  getRuleSet,
  updateRuleSet,
} from "@/lib/api/journal-structure";
import { parseRuleSetUpdatePayload } from "@/lib/validation/journal-structure";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;

  try {
    const row = await getRuleSet(id, userId);
    if (!row) {
      return NextResponse.json({ error: "Rulebook not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load rulebook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parseRuleSetUpdatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid rulebook payload",
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const row = await updateRuleSet(id, userId, result.data);
    return NextResponse.json(row);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update rulebook";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;

  try {
    await deleteRuleSet(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete rulebook";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
