import { NextRequest, NextResponse } from 'next/server';
import { getWindowsMt5WorkerAssignments } from '@/lib/mt5-sync/assignments';
import {
    readMt5WorkerRequestMetadata,
    validateMt5WorkerSecret,
} from '@/lib/mt5-sync/worker-auth';

export async function GET(request: NextRequest) {
    try {
        const auth = validateMt5WorkerSecret(request);
        if (!auth.configured) {
            return NextResponse.json(
                { error: 'MT5 worker secret is not configured' },
                { status: 500 }
            );
        }

        if (!auth.valid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { workerId, workerHost } = readMt5WorkerRequestMetadata(request);
        if (!workerId) {
            return NextResponse.json(
                { error: 'x-worker-id header is required' },
                { status: 400 }
            );
        }

        const assignments = await getWindowsMt5WorkerAssignments(
            workerId,
            workerHost
        );

        return NextResponse.json(assignments);
    } catch (error) {
        console.error('[MT5Worker/Assignments] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
