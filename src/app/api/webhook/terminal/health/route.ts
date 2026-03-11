/**
 * GET /api/webhook/terminal/health
 * No auth. Used to verify the app is reachable from the MT5 container (e.g. curl from host or container).
 */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, service: 'webhook-terminal' });
}
