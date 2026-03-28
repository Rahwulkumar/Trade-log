import { readJsonIfAvailable } from "@/lib/api/client/http";

export interface StrategyEvaluation {
  score: number;
  readiness: "weak" | "workable" | "strong";
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

interface EvaluateStrategyResponse {
  success: boolean;
  evaluation?: StrategyEvaluation;
  error?: string;
}

export async function evaluateStrategyWithAI(params: {
  name: string;
  description?: string | null;
  rules: string[];
  existingStrategies?: string[];
}): Promise<StrategyEvaluation> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "evaluate-strategy",
      strategy: {
        name: params.name,
        description: params.description ?? null,
        rules: params.rules,
      },
      context: params.existingStrategies?.length
        ? {
            existingStrategies: params.existingStrategies,
          }
        : undefined,
    }),
  });

  const payload = await readJsonIfAvailable<EvaluateStrategyResponse>(response);

  if (!response.ok || !payload?.success || !payload.evaluation) {
    throw new Error(payload?.error || "Unable to evaluate strategy.");
  }

  return payload.evaluation;
}
