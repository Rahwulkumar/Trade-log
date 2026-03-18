/**
 * Simple in-memory sliding window rate limiter.
 * Suitable for single-server / Vercel serverless (per-instance).
 * For multi-instance deploys, replace with Upstash Redis.
 */

import { NextResponse } from 'next/server';

interface RateLimitStore {
    timestamps: number[];
}

const store = new Map<string, RateLimitStore>();

/**
 * Check whether a request should be allowed.
 * @param key      Unique key (e.g. `webhook:trades:terminalId`)
 * @param limit    Maximum requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns `{ allowed: boolean; retryAfterMs: number }`
 */
export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = store.get(key);
    if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
    }

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter(t => t > windowStart);

    if (entry.timestamps.length >= limit) {
        const oldest = entry.timestamps[0];
        const retryAfterMs = oldest + windowMs - now;
        return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    entry.timestamps.push(now);
    return { allowed: true, retryAfterMs: 0 };
}

export function getRateLimitClientId(request: Request, userId?: string | null): string {
    if (userId) {
        return `user:${userId}`;
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    const candidateIp =
        forwardedFor?.split(',')[0]?.trim() ||
        request.headers.get('cf-connecting-ip')?.trim() ||
        request.headers.get('x-real-ip')?.trim();

    if (candidateIp) {
        return `ip:${candidateIp}`;
    }

    return 'anonymous';
}

export function createRateLimitResponse(
    retryAfterMs: number,
    error = 'Too many requests'
): NextResponse {
    return NextResponse.json(
        { success: false, error },
        {
            status: 429,
            headers: {
                'Retry-After': String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
            },
        }
    );
}
