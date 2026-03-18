import { NextRequest, NextResponse } from 'next/server';
import { requireMachineSecret } from '@/lib/auth/server';
import { getOrchestratorConfig } from '@/lib/terminal-farm/service';

export async function GET(request: NextRequest) {
    try {
        const access = await requireMachineSecret(request, {
            secretEnvVar: 'ORCHESTRATOR_SECRET',
            headerNames: ['x-orchestrator-secret', 'authorization'],
        });
        if (access.error) {
            return access.error;
        }

        const config = await getOrchestratorConfig();

        console.log(`[Orchestrator] Returning config for ${config.length} terminals`);

        return NextResponse.json(config);
    } catch (error) {
        console.error('[Orchestrator] Error fetching config:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
