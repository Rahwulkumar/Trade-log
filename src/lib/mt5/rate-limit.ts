import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
    mt5_connect: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
    mt5_sync: { max: 10, windowMs: 60 * 60 * 1000 },   // 10 per hour
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    message?: string;
}

/**
 * Check if user has exceeded rate limit for a given action
 * Uses atomic PostgreSQL function to prevent race conditions
 */
export async function checkRateLimit(
    userId: string,
    action: RateLimitAction
): Promise<RateLimitResult> {
    const supabase = createAdminClient();
    const limit = RATE_LIMITS[action];
    const windowStart = new Date(Date.now() - limit.windowMs);

    try {
        // Use atomic PostgreSQL function for check + increment
        const { data: result, error } = await (supabase as any)
            .rpc('check_rate_limit', {
                p_user_id: userId,
                p_action: action,
                p_window_start: windowStart.toISOString(),
                p_max_attempts: limit.max
            })
            .single();

        if (error) {
            console.error('[Rate Limit] Error calling check_rate_limit:', error);
            // Fail open - allow the request if we can't check rate limit
            return {
                allowed: true,
                remaining: limit.max,
                resetAt: new Date(Date.now() + limit.windowMs),
            };
        }

        if (!result || !result.allowed) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: new Date(Date.now() + limit.windowMs),
                message: `Rate limit exceeded. You can perform this action ${limit.max} times per hour. Try again later.`,
            };
        }

        return {
            allowed: true,
            remaining: result.remaining,
            resetAt: new Date(Date.now() + limit.windowMs),
        };
    } catch (err) {
        console.error('[Rate Limit] Exception:', err);
        // Fail open
        return {
            allowed: true,
            remaining: limit.max,
            resetAt: new Date(Date.now() + limit.windowMs),
        };
    }
}

/**
 * Clean up old rate limit records (older than 2 hours)
 * Call this periodically or on-demand
 */
export async function cleanupRateLimitRecords(): Promise<void> {
    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    await (supabase as any)
        .from('rate_limit_tracking')
        .delete()
        .lt('attempted_at', cutoff.toISOString());
}
