/**
 * Terminal Farm Health Check
 * GET /api/terminal-farm/health
 *
 * Returns health status of all terminal instances.
 * Requires either a valid user session or the ORCHESTRATOR_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { calculateTerminalHealth } from '@/lib/terminal-farm/metrics';

type TerminalRow = {
    id: string;
    status: string;
    last_heartbeat: string | null;
    last_sync_at: string | null;
};

export async function GET(request: NextRequest) {
    // Accept either a browser session OR the orchestrator secret header
    const orchestratorSecret = process.env.ORCHESTRATOR_SECRET;
    const authHeader = request.headers.get('authorization');

    if (orchestratorSecret && authHeader === `Bearer ${orchestratorSecret}`) {
        // Orchestrator machine-to-machine auth — proceed
    } else {
        // Fall back to user session check
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
    }

    try {
        // terminal_instances is not in the generated Supabase types (added by terminal farm migration)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = createAdminClient() as any;
        const { data: terminals, error } = await db
            .from('terminal_instances')
            .select('id, status, last_heartbeat, last_sync_at')
            .in('status', ['PENDING', 'STARTING', 'RUNNING', 'STOPPING']) as {
                data: TerminalRow[] | null;
                error: { message: string } | null;
            };

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        const health = (terminals ?? []).map(terminal => calculateTerminalHealth(terminal));

        const summary = {
            total: health.length,
            healthy: health.filter(h => h.isHealthy).length,
            unhealthy: health.filter(h => !h.isHealthy).length,
            byStatus: health.reduce((acc, h) => {
                acc[h.status] = (acc[h.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
        };

        return NextResponse.json({
            success: true,
            summary,
            terminals: health,
        });
    } catch (error) {
        console.error('[TerminalFarm/Health] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
