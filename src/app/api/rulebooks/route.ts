import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { createRuleSet, getRuleSets } from "@/lib/api/journal-structure";
import { parseRuleSetCreatePayload } from "@/lib/validation/journal-structure";

export async function GET(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const rows = await getRuleSets(userId, { activeOnly });
    return NextResponse.json(rows);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load rulebooks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parseRuleSetCreatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid rulebook payload",
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const ruleSet = await createRuleSet(userId, result.data);
    return NextResponse.json(ruleSet, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create rulebook";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
