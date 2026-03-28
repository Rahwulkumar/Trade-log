import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { analyzeNews, analyzeTrades, chatWithAI, evaluateStrategy, type ChatMessage } from '@/lib/api/gemini';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/http';
import { parseAiRequestPayload } from '@/lib/validation/ai';
import { checkRateLimit, createRateLimitResponse, getRateLimitClientId } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const rateLimit = checkRateLimit(
        `api:ai:${getRateLimitClientId(request, userId)}`,
        20,
        60_000
    );
    if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.retryAfterMs, 'AI request limit exceeded');
    }

    try {
        const body = await request.json().catch(() => null);
        const result = parseAiRequestPayload(body);
        if (!result.success) {
            return apiValidationError('Invalid AI request payload', result.error.flatten());
        }

        const params = result.data;

        switch (params.action) {
            case 'evaluate-strategy': {
                const evaluation = await evaluateStrategy(
                    params.strategy,
                    params.context as Parameters<typeof evaluateStrategy>[1]
                );
                return apiSuccess({ evaluation });
            }

            case 'chat': {
                const messages = params.messages as ChatMessage[];
                const response = await chatWithAI(messages, params.newMessage);
                return apiSuccess({ response });
            }

            case 'analyze-trades': {
                const insights = await analyzeTrades(
                    params.trades as Parameters<typeof analyzeTrades>[0],
                    params.focusAreas
                );
                return apiSuccess({ insights });
            }

            case 'analyze-news': {
                const analysis = await analyzeNews(
                    params.events as Parameters<typeof analyzeNews>[0],
                    params.pair,
                    params.question || `Should I trade ${params.pair} based on today's news?`
                );
                return apiSuccess({ analysis });
            }
        }
    } catch (error) {
        console.error('[AI API] Error:', error);
        return apiError(500, error instanceof Error ? error.message : 'Unknown error');
    }
}
