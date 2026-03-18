import { NextRequest } from 'next/server';
import { requireAdminOrSecret } from '@/lib/auth/server';
import { apiError, apiSuccess } from '@/lib/api/http';
import { db } from '@/lib/db';
import { terminalInstances } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { calculateTerminalHealth } from '@/lib/terminal-farm/metrics';

export async function GET(request: NextRequest) {
  const access = await requireAdminOrSecret(request, {
    secretEnvVar: 'ORCHESTRATOR_SECRET',
    headerNames: ['authorization'],
  });
  if (access.error) return access.error;

  try {
    const terminals = await db
      .select({
        id: terminalInstances.id,
        status: terminalInstances.status,
        lastHeartbeat: terminalInstances.lastHeartbeat,
        lastSyncAt: terminalInstances.lastSyncAt,
      })
      .from(terminalInstances)
      .where(inArray(terminalInstances.status, ['PENDING', 'STARTING', 'RUNNING', 'STOPPING']));

    const health = terminals.map((terminal) =>
      calculateTerminalHealth({
        id: terminal.id,
        status: terminal.status,
        last_heartbeat: terminal.lastHeartbeat?.toISOString() ?? null,
        last_sync_at: terminal.lastSyncAt?.toISOString() ?? null,
      }),
    );

    const summary = {
      total: health.length,
      healthy: health.filter((item) => item.isHealthy).length,
      unhealthy: health.filter((item) => !item.isHealthy).length,
      byStatus: health.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return apiSuccess({ summary, terminals: health });
  } catch (error) {
    console.error('[TerminalFarm/Health] Error:', error);
    return apiError(500, 'Internal server error');
  }
}
