import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import {
  createSetupDefinition,
  getSetupDefinitions,
} from "@/lib/api/journal-structure";
import { parseSetupDefinitionCreatePayload } from "@/lib/validation/journal-structure";

export async function GET(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const rows = await getSetupDefinitions(userId, { activeOnly });
    return NextResponse.json(rows);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load setups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parseSetupDefinitionCreatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid setup payload",
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const setup = await createSetupDefinition(userId, result.data);
    return NextResponse.json(setup, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create setup";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
