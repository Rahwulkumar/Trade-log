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
 */
export async function checkRateLimit(
    userId: string,
    action: RateLimitAction
): Promise<RateLimitResult> {
    const supabase = createAdminClient();
    const limit = RATE_LIMITS[action];
    const windowStart = new Date(Date.now() - limit.windowMs);

    try {
        // Count attempts in current window
        const { data: attempts, error } = await (supabase as any)
            .from('rate_limit_tracking')
            .select('id')
            .eq('user_id', userId)
            .eq('action', action)
            .gte('attempted_at', windowStart.toISOString());

        if (error) {
            console.error('Rate limit check error:', error);
            // Fail open - allow the request if we can't check rate limit
            return {
                allowed: true,
                remaining: limit.max,
                resetAt: new Date(Date.now() + limit.windowMs),
            };
        }

        const currentCount = attempts?.length || 0;

        if (currentCount >= limit.max) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: new Date(Date.now() + limit.windowMs),
                message: `Rate limit exceeded. You can perform this action ${limit.max} times per hour. Try again later.`,
            };
        }

        // Log this attempt
        await (supabase as any).from('rate_limit_tracking').insert({
            user_id: userId,
            action,
            attempted_at: new Date().toISOString(),
        });

        return {
            allowed: true,
            remaining: limit.max - currentCount - 1,
            resetAt: new Date(Date.now() + limit.windowMs),
        };
    } catch (err) {
        console.error('Rate limit error:', err);
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
