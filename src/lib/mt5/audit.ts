import { type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuditAction = 'mt5_connect' | 'mt5_disconnect' | 'mt5_sync';

export interface AuditLogParams {
    userId: string;
    action: AuditAction;
    resourceId?: string;
    metadata?: Record<string, any>;
    req?: NextRequest;
}

/**
 * Log an audit event for MT5 actions
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
    const supabase = createAdminClient();

    // Extract IP and user agent from request
    const ip = params.req?.headers.get('x-forwarded-for') ||
        params.req?.headers.get('x-real-ip') ||
        'unknown';
    const userAgent = params.req?.headers.get('user-agent') || 'unknown';

    try {
        await (supabase as any).from('audit_logs').insert({
            user_id: params.userId,
            action: params.action,
            resource_type: 'mt5_connection',
            resource_id: params.resourceId,
            metadata: params.metadata || {},
            ip_address: ip,
            user_agent: userAgent.substring(0, 500), // Limit length
        });
    } catch (error) {
        // Log but don't fail the main operation if audit logging fails
        console.error('Audit logging error:', error);
    }
}

