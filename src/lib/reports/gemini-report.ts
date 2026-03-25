import 'server-only';

import { GoogleGenerativeAI } from '@google/generative-ai';

import type { ReportAiCommentary, TradeReportSnapshot } from '@/lib/reports/types';

function getGeminiApiKey(): string {
  const serverKey = process.env.GEMINI_API_KEY?.trim();
  const legacyPublicKey = process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_KEY?.trim();
  const apiKey = serverKey || legacyPublicKey;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Add GEMINI_API_KEY to .env.local.');
  }

  return apiKey;
}

function getGeminiModel() {
  const client = new GoogleGenerativeAI(getGeminiApiKey());
  return client.getGenerativeModel({ model: 'gemini-2.5-pro' });
}

function extractJsonObject(text: string): string {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Gemini report commentary.');
  }
  return jsonMatch[0];
}

function normalizeGeminiError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('429') || message.toLowerCase().includes('quota')) {
    return new Error(
      'Gemini commentary is temporarily unavailable because the configured API key has exhausted its current quota. The report itself is still valid. Check Gemini billing and quota, or try again later.',
    );
  }

  if (message.includes('503') || message.toLowerCase().includes('unavailable')) {
    return new Error(
      'Gemini commentary is temporarily unavailable right now. The report itself is still valid. Try generating AI commentary again in a few minutes.',
    );
  }

  return new Error(message);
}

function buildAiPayload(snapshot: TradeReportSnapshot) {
  return {
    reportType: snapshot.reportType,
    generatedAt: snapshot.generatedAt,
    filters: snapshot.filters,

    // Full summary — no truncation
    summary: snapshot.summary,
    styleProfile: snapshot.styleProfile,

    // Full execution risk data
    executionRisk: snapshot.executionRisk,

    // Full behavioral data
    behavioral: {
      repeatedLessons: snapshot.behavioral.repeatedLessons,
      commonSetupTags: snapshot.behavioral.commonSetupTags,
      commonMistakeTags: snapshot.behavioral.commonMistakeTags,
      bestSession: snapshot.behavioral.bestSession,
      weakestSession: snapshot.behavioral.weakestSession,
      highConvictionLossRate: snapshot.behavioral.highConvictionLossRate,
      lowConvictionLossRate: snapshot.behavioral.lowConvictionLossRate,
      highRatedTradeWinRate: snapshot.behavioral.highRatedTradeWinRate,
      weakManagementTradeLossRate: snapshot.behavioral.weakManagementTradeLossRate,
    },

    // Full distributions — no truncation
    distributions: {
      symbols: snapshot.distributions.symbols,
      directions: snapshot.distributions.directions,
      sessions: snapshot.distributions.sessions,
      playbooks: snapshot.distributions.playbooks,
      setupTags: snapshot.distributions.setupTags,
      mistakeTags: snapshot.distributions.mistakeTags,
    },

    // Full timing — all weekdays, all 24 hours, all hold buckets
    timing: {
      weekdays: snapshot.timing.weekdays.filter((row) => row.trades > 0),
      hours: snapshot.timing.hours,
      holdBuckets: snapshot.timing.holdBuckets.filter((row) => row.trades > 0),
    },

    // More trade samples for pattern detection (up to 40)
    tradeSamples: snapshot.detailedTrades.slice(0, 40),
  };
}

function buildPrompt(payload: ReturnType<typeof buildAiPayload>): string {
  return `You are an elite professional trading performance analyst and coach with 20+ years of experience reviewing trader P&L books. You write reports for hedge funds, prop trading firms, and serious retail traders.

You have just received a structured data export from a trader's journal. Every number in this payload is factual — computed directly from their closed trade records. Your job is to write a comprehensive, deeply analytical performance review that reads like it was written by a world-class trading mentor who spent an hour studying this data before writing.

ABSOLUTE RULES:
- Reference specific numbers from the payload throughout your analysis. Never be vague when data exists.
- Do NOT invent or estimate any number that is not present in the payload.
- Do NOT recompute numbers differently from how they appear in the payload.
- Every observation must be traceable back to a specific data point.
- Write with the authority and directness of a head risk manager reviewing a junior trader's book.
- Do NOT soften criticism. If something is a problem, name it precisely and explain the consequence.
- Do NOT pad praise. If something is genuinely strong, explain what it means quantitatively.
- Avoid generic trading advice. Every sentence must be specific to THIS trader's data.
- The narrative sections must read as flowing prose — no bullet points, no headers inside the text.

WHAT TO WRITE IN EACH NARRATIVE SECTION:

performanceNarrative (3-4 paragraphs of flowing prose):
  - Open with the raw P&L story: total net P&L, win rate, profit factor, expectancy — what does this period say at a headline level?
  - Dig into the win/loss dollar asymmetry. What is the ratio of average win to average loss? Is this trader making money through frequency or through size? What does this say about their edge type?
  - Analyse the R-multiple story. Average R and the R-distribution shape. A profitable trader with a low average R means they're grinding for small wins. A trader with a high average R but low win rate is home-run hunting. Which is this? Is it sustainable?
  - Close with a clear verdict on whether this period's P&L profile is structurally sound or whether the profitability (or losses) are fragile.

psychologyAnalysis (2-3 paragraphs of flowing prose):
  - Cross-reference conviction scores with trade outcomes. Does high conviction (4-5) predict better outcomes? Reference highConvictionLossRate and lowConvictionLossRate explicitly. A trader who loses at higher rates when they feel most confident has a serious calibration problem.
  - What do the entry, exit, and management ratings reveal? If management ratings are low, the trader is entering well but mismanaging live positions. If entry ratings are low, the trigger discipline is weak.
  - What do the repeated lessons reveal? If the same lesson text appears 3+ times, this is not a knowledge gap — it is a behavioural pattern the trader knows about but cannot break. Name these patterns explicitly and call out the psychological implication.
  - What does the "would take again" percentage say about their post-hoc judgment vs actual outcomes?

riskAnalysis (2-3 paragraphs of flowing prose):
  - MAE/MFE efficiency analysis. What is the ratio of average MAE to average MFE overall? Now compare for winners vs losers specifically. If avgWinnerMfe is large relative to avgWinnerMae, winners are running well with tight heat — good. If avgLoserMae is much larger than avgLoserMfe, losers are trending hard against the trader — bad stop management.
  - R-distribution shape. If there are too many trades at -2R or worse, this means stops are being removed, or the trader is averaging into losers. If the distribution is heavy in the 0 to +1R bucket, they are cutting winners short. Be specific about what the distribution shape implies.
  - Stop loss coverage. If noStopLossPercent is above 10%, this is a serious risk management deficiency. Quantify the exposure this creates.

timingAnalysis (2 paragraphs of flowing prose):
  - Best vs worst session with exact win rates and P&L from the data. Is there a session where the trader is clearly better or worse? What is the likely reason (market structure, liquidity, their schedule)?
  - Day of week and hour of day patterns. Reference the strongest and weakest days and hours with their actual P&L and trade counts. Hold time distribution — what does the dominant hold bucket say about their edge type? Are they built to scalp or to hold?

playbookAnalysis (2 paragraphs of flowing prose):
  - Which specific playbooks (strategies) are generating returns and which are destroying capital? Reference their names, trade counts, win rates, and P&L from the distributions data. If a playbook has a negative P&L, name it and say what that means.
  - Setup tag and mistake tag analysis. Which setup tags are correlated with winning trades? Which mistake tags appear most often on losing trades? This tells the trader not just WHAT they do wrong, but in which SETUP CONTEXT they do it.

verdict (1 decisive paragraph):
  - One authoritative overall verdict on this period. Was this a structurally strong period, a mixed period, or a destructive period? Why? What is the single most important thing this trader must address to improve? Make it direct and unambiguous.

FOR ALL BULLET LISTS — every point must cite specific data, not generic advice:

strengths: 4-6 specific strengths. Each must reference an actual number from the payload. Not "good risk management" — instead "Profit factor of X.XX indicates that for every dollar lost, the trader recovered $X.XX in gross profit, which is above the breakeven threshold of 1.0."

weaknesses: 4-6 specific weaknesses. Each must name the exact weakness and quantify it. Not "poor timing" — instead "Wednesday trades show a win rate of X% vs the overall X%, suggesting a consistent edge degradation mid-week."

psychologyFlags: 3-5 psychological signals from the data. Conviction accuracy, repeated lesson patterns, self-assessment calibration (would-take-again accuracy), management rating vs outcome correlation.

riskFlags: 3-5 specific risk observations. MAE/MFE efficiency ratios, stop coverage gaps, R-distribution tail risks, no-stop-loss exposure.

repeatedPatterns: 3-5 behavioural patterns that appear consistently across the dataset. These are habits — both good and bad. Reference how frequently they appear.

timingObservations: 3-5 precise timing insights. Not "trade in the morning" — instead "Trades entered between 08:00-10:00 UTC show an average P&L of $X vs the overall average of $X — a X% edge improvement."

playbookObservations: 3-5 strategy-level observations. Which playbooks are performing, which are underperforming, which setups are being overused.

quickWins: 3-5 specific things the trader should do or stop doing IMMEDIATELY (next 1-2 weeks). Concrete and actionable to their specific data.

longerTermFocus: 2-3 deeper structural improvements that will take weeks or months to address. These are the root causes, not the symptoms.

correctiveActions: 5-8 precise, numbered corrective actions. Written as direct instructions to the trader. Specific to their numbers, not generic trading advice.

confidence: One sentence explaining the reliability of this analysis based on the trade count, data coverage (R-multiples, MAE/MFE, session tags), and consistency of patterns observed.

Return ONLY this exact JSON — no markdown, no code blocks, no commentary outside the JSON:
{
  "headline": "A crisp, specific headline that captures the defining characteristic of this period in 8-12 words",
  "executiveSummary": "3-4 sentences that give the complete picture — P&L outcome, structural health, single biggest strength, single biggest risk",
  "performanceNarrative": "Full flowing prose, 3-4 paragraphs",
  "psychologyAnalysis": "Full flowing prose, 2-3 paragraphs",
  "riskAnalysis": "Full flowing prose, 2-3 paragraphs",
  "timingAnalysis": "Full flowing prose, 2 paragraphs",
  "playbookAnalysis": "Full flowing prose, 2 paragraphs",
  "verdict": "One decisive authoritative paragraph",
  "strengths": ["specific strength with number", "specific strength with number", "..."],
  "weaknesses": ["specific weakness with number", "specific weakness with number", "..."],
  "psychologyFlags": ["psychology signal", "..."],
  "riskFlags": ["risk observation", "..."],
  "repeatedPatterns": ["pattern with frequency reference", "..."],
  "timingObservations": ["specific timing insight with numbers", "..."],
  "playbookObservations": ["strategy-level observation", "..."],
  "quickWins": ["immediate actionable instruction", "..."],
  "longerTermFocus": ["deeper structural focus area", "..."],
  "correctiveActions": ["Direct numbered instruction to the trader", "..."],
  "confidence": "Confidence assessment sentence"
}

REPORT DATA:
${JSON.stringify(payload, null, 2)}`;
}

export async function generateReportAiCommentary(
  snapshot: TradeReportSnapshot,
): Promise<ReportAiCommentary> {
  try {
    const model = getGeminiModel();
    const payload = buildAiPayload(snapshot);
    const prompt = buildPrompt(payload);

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return JSON.parse(extractJsonObject(text)) as ReportAiCommentary;
  } catch (error) {
    throw normalizeGeminiError(error);
  }
}
