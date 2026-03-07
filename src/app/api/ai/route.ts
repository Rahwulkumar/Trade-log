import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { generateStrategy, chatWithAI, analyzeTrades, analyzeNews, type ChatMessage } from '@/lib/api/gemini';

export async function POST(request: NextRequest) {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { action, ...params } = body;

        switch (action) {
            case 'generate-strategy': {
                const strategy = await generateStrategy(params.prompt, params.context);
                return NextResponse.json({ success: true, strategy });
            }

            case 'chat': {
                const messages = params.messages as ChatMessage[];
                const response = await chatWithAI(messages, params.newMessage);
                return NextResponse.json({ success: true, response });
            }

            case 'analyze-trades': {
                const insights = await analyzeTrades(params.trades, params.focusAreas);
                return NextResponse.json({ success: true, insights });
            }

            case 'analyze-news': {
                const analysis = await analyzeNews(params.events, params.pair, params.question);
                return NextResponse.json({ success: true, analysis });
            }

            default:
                return NextResponse.json(
                    { success: false, error: 'Unknown action' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('[AI API] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
