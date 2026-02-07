import { GoogleGenerativeAI } from '@google/generative-ai';
import { Trade, Json } from '@/lib/supabase/types';

// Initialize Gemini (server-side only!)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: {
        strategyId?: string;
        rules?: string[];
    };
}

export interface StrategyRule {
    id: string;
    text: string;
    type: 'entry' | 'exit' | 'filter' | 'risk';
    required: boolean;
    executable?: {
        indicator?: string;
        timeframe?: string;
        condition: string;
        params: Record<string, Json>;
    };
}

export interface GeneratedStrategy {
    name: string;
    description: string;
    rules: StrategyRule[];
    suggestedAssets: string[];
    riskLevel: 'low' | 'medium' | 'high';
}

const SYSTEM_PROMPT = `You are an expert trading strategy assistant. Your role is to:
1. Help traders define their trading strategies in clear, actionable rules
2. Convert natural language descriptions into structured trading rules
3. Provide insights on strategy strengths and weaknesses
4. Suggest improvements based on trading best practices

When creating strategies, always include:
- Clear entry conditions
- Exit conditions (both profit and loss)
- Risk management rules
- Time/session filters if applicable

Format your rules as JSON when asked to create a strategy.`;

/**
 * Generate a trading strategy from natural language description
 */
export async function generateStrategy(
    prompt: string,
    context?: { existingStrategies?: string[]; tradingHistory?: Trade[] }
): Promise<GeneratedStrategy> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const userPrompt = `
Create a trading strategy based on this description: "${prompt}"

${context?.existingStrategies?.length ? `User's existing strategies: ${context.existingStrategies.join(', ')}` : ''}

Return a JSON object with this exact structure:
{
  "name": "Strategy Name",
  "description": "Brief description",
  "rules": [
    {
      "id": "rule_1",
      "text": "Human readable rule",
      "type": "entry|exit|filter|risk",
      "required": true|false
    }
  ],
  "suggestedAssets": ["NQ", "EUR/USD"],
  "riskLevel": "low|medium|high"
}

Only return the JSON, no markdown or explanation.`;

    const result = await model.generateContent([SYSTEM_PROMPT, userPrompt]);
    const text = result.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to parse strategy response');
    }

    return JSON.parse(jsonMatch[0]) as GeneratedStrategy;
}

/**
 * Chat with AI about trading strategies
 */
export async function chatWithAI(
    messages: ChatMessage[],
    newMessage: string
): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const chatHistory = messages.map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n\n');

    const prompt = `
${SYSTEM_PROMPT}

Previous conversation:
${chatHistory}

User: ${newMessage}

Respond helpfully and concisely. If the user asks to create a strategy, guide them through defining clear rules.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

/**
 * Analyze trades and generate insights
 */
export async function analyzeTrades(
    trades: Trade[],
    focusAreas: string[] = ['patterns', 'timing', 'risk']
): Promise<{ title: string; content: string; confidence: number }[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const tradesSummary = {
        totalTrades: trades.length,
        winners: trades.filter(t => t.pnl > 0).length,
        losers: trades.filter(t => t.pnl < 0).length,
        avgPnL: trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length,
        bySymbol: trades.reduce((acc: Record<string, number>, t) => {
            acc[t.symbol] = (acc[t.symbol] || 0) + 1;
            return acc;
        }, {}),
        byHour: trades.reduce((acc: Record<number, number>, t) => {
            const hour = new Date(t.entry_date).getHours();
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {}),
    };

    const prompt = `
Analyze this trading data and provide insights:

${JSON.stringify(tradesSummary, null, 2)}

Focus areas: ${focusAreas.join(', ')}

Return a JSON array of insights:
[
  {
    "title": "Insight title",
    "content": "Detailed explanation",
    "confidence": 0.85
  }
]

Only return the JSON array, no markdown.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        return [{ title: 'Analysis Complete', content: text, confidence: 0.7 }];
    }

    return JSON.parse(jsonMatch[0]);
}

/**
 * Score a trade setup against strategy rules
 */
export async function scoreTradeSetup(
    setup: { symbol: string; price: number; direction: string },
    strategyRules: StrategyRule[],
    checkedRules: string[]
): Promise<{ score: number; grade: string; notes: string }> {
    const totalRequired = strategyRules.filter(r => r.required).length;
    const checkedRequired = strategyRules
        .filter(r => r.required && checkedRules.includes(r.id)).length;

    const totalOptional = strategyRules.filter(r => !r.required).length;
    const checkedOptional = strategyRules
        .filter(r => !r.required && checkedRules.includes(r.id)).length;

    // Score calculation
    const requiredScore = totalRequired > 0 ? (checkedRequired / totalRequired) * 70 : 70;
    const optionalScore = totalOptional > 0 ? (checkedOptional / totalOptional) * 30 : 30;
    const score = Math.round(requiredScore + optionalScore);

    // Grade assignment
    let grade: string;
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else grade = 'D';

    // Generate notes
    const uncheckedRequired = strategyRules
        .filter(r => r.required && !checkedRules.includes(r.id))
        .map(r => r.text);

    let notes = `${checkedRules.length}/${strategyRules.length} rules met. `;
    if (uncheckedRequired.length > 0) {
        notes += `Missing required: ${uncheckedRequired.join(', ')}`;
    }

    return { score, grade, notes };
}
