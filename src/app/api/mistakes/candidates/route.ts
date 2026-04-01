import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/server";
import { getMistakePromotionCandidates } from "@/lib/api/journal-structure";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const rows = await getMistakePromotionCandidates(userId);
    return NextResponse.json(rows);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load mistake suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

