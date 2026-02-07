/**
 * Orchestrator Config Endpoint
 * GET /api/orchestrator/config
 * 
 * Called by the Python orchestrator every 60 seconds to fetch
 * the desired state of all terminal containers.
 * 
 * Returns decrypted MT5 credentials for container provisioning.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestratorConfig } from '@/lib/terminal-farm/service';

export async function GET(request: NextRequest) {
    try {
        // Validate orchestrator secret
        const secret = request.headers.get('x-orchestrator-secret');
        const expectedSecret = process.env.ORCHESTRATOR_SECRET;

        if (!expectedSecret) {
            console.warn('[Orchestrator] ORCHESTRATOR_SECRET not configured');
            return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
        }

        if (secret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const config = await getOrchestratorConfig();

        console.log(`[Orchestrator] Returning config for ${config.length} terminals`);

        return NextResponse.json(config);
    } catch (error) {
        console.error('[Orchestrator] Error fetching config:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
