/**
 * Terminal Farm Health Check
 * GET /api/terminal-farm/health
 * 
 * Returns health status of all terminal instances
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateTerminalHealth } from '@/lib/terminal-farm/metrics';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const { data: terminals, error } = await supabase
            .from('terminal_instances')
            .select('id, status, last_heartbeat, last_sync_at')
            .in('status', ['PENDING', 'STARTING', 'RUNNING', 'STOPPING']);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        const health = terminals?.map(terminal => calculateTerminalHealth(terminal)) || [];

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
