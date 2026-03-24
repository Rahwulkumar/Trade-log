import { readJsonIfAvailable } from "@/lib/api/client/http";

export interface StrategyBuilderMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface GeneratedStrategy {
  name: string;
  description: string;
  rules: { id: string; text: string; required: boolean }[];
}

interface GenerateStrategyResponse {
  success: boolean;
  strategy?: GeneratedStrategy;
  error?: string;
}

export async function generateStrategyWithAI(params: {
  prompt: string;
  messages?: StrategyBuilderMessage[];
  existingStrategies?: string[];
}): Promise<GeneratedStrategy> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "generate-strategy",
      prompt: params.prompt,
      messages: params.messages,
      context: params.existingStrategies?.length
        ? {
            existingStrategies: params.existingStrategies,
          }
        : undefined,
    }),
  });

  const payload = await readJsonIfAvailable<GenerateStrategyResponse>(response);

  if (!response.ok || !payload?.success || !payload.strategy) {
    throw new Error(payload?.error || "Unable to generate strategy.");
  }

  return payload.strategy;
}
