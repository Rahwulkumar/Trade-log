import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/server";
import { getSetupPromotionCandidates } from "@/lib/api/journal-structure";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const rows = await getSetupPromotionCandidates(userId);
    return NextResponse.json(rows);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load setup suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

