import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/auth/server";
import { getAnalyticsWorkspaceResult } from "@/lib/analytics/query";
import { parseAnalyticsWorkspaceQuery } from "@/lib/validation/analytics-query";

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = parseAnalyticsWorkspaceQuery(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid analytics workspace query",
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  const payload = await getAnalyticsWorkspaceResult(userId, result.data);
  return NextResponse.json(payload);
}
