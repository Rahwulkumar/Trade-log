import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { terminalInstances } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { calculateTerminalHealth } from '@/lib/terminal-farm/metrics';

export async function GET(request: NextRequest) {
  // Accept either a browser session OR the orchestrator secret header
  const orchestratorSecret = process.env.ORCHESTRATOR_SECRET;
  const authHeader = request.headers.get('authorization');

  if (orchestratorSecret && authHeader === `Bearer ${orchestratorSecret}`) {
    // Orchestrator machine-to-machine auth — proceed
  } else {
    // Fall back to Clerk user session check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const terminals = await db
      .select({
        id: terminalInstances.id,
        status: terminalInstances.status,
        last_heartbeat: terminalInstances.lastHeartbeat,
        last_sync_at: terminalInstances.lastSyncAt,
      })
      .from(terminalInstances)
      .where(
        inArray(terminalInstances.status, ['PENDING', 'STARTING', 'RUNNING', 'STOPPING'])
      );

    const health = terminals.map(t => calculateTerminalHealth({
      id: t.id,
      status: t.status,
      last_heartbeat: t.last_heartbeat?.toISOString() ?? null,
      last_sync_at: t.last_sync_at?.toISOString() ?? null,
    }));

    const summary = {
      total: health.length,
      healthy: health.filter(h => h.isHealthy).length,
      unhealthy: health.filter(h => !h.isHealthy).length,
      byStatus: health.reduce((acc, h) => {
        acc[h.status] = (acc[h.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({ success: true, summary, terminals: health });
  } catch (error) {
    console.error('[TerminalFarm/Health] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
