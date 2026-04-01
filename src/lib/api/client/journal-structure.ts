import { readJsonIfAvailable } from "@/lib/api/client/http";
import type {
  JournalTemplate,
  JournalTemplateInsert,
  MistakeDefinition,
  MistakeDefinitionInsert,
  RuleSetInsert,
  RuleSetItemInsert,
  SetupDefinition,
  SetupDefinitionInsert,
} from "@/lib/db/schema";
import type { RuleSetWithItems } from "@/lib/rulebooks/types";
import type { JournalPromotionCandidate } from "@/lib/journal-structure/promotion";

interface ApiErrorPayload {
  error?: string;
  message?: string;
}

function isApiErrorPayload(payload: unknown): payload is ApiErrorPayload {
  return (
    !!payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    ("error" in payload || "message" in payload)
  );
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (isApiErrorPayload(payload) && typeof payload.error === "string") {
    return payload.error;
  }

  if (isApiErrorPayload(payload) && typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}

async function readResponse<T>(
  res: Response,
  fallback: string,
): Promise<T> {
  const payload = await readJsonIfAvailable<T | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, fallback));
  }

  if (!payload) {
    throw new Error(fallback);
  }

  return payload as T;
}

type RuleSetItemPayload = Omit<
  RuleSetItemInsert,
  "id" | "userId" | "ruleSetId" | "createdAt" | "updatedAt" | "sortOrder"
>;

export async function getSetupDefinitions(options?: {
  activeOnly?: boolean;
}): Promise<SetupDefinition[]> {
  const suffix = options?.activeOnly ? "?active=true" : "";
  const res = await fetch(`/api/setups${suffix}`);
  return readResponse<SetupDefinition[]>(res, "Failed to load setups");
}

export async function createSetupDefinition(
  data: Omit<SetupDefinitionInsert, "userId" | "id" | "createdAt" | "updatedAt">,
): Promise<SetupDefinition> {
  const res = await fetch("/api/setups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readResponse<SetupDefinition>(res, "Failed to create setup");
}

export async function updateSetupDefinition(
  id: string,
  data: Partial<
    Omit<SetupDefinitionInsert, "userId" | "id" | "createdAt" | "updatedAt">
  >,
): Promise<SetupDefinition> {
  const res = await fetch(`/api/setups/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readResponse<SetupDefinition>(res, "Failed to update setup");
}

export async function deleteSetupDefinition(id: string): Promise<void> {
  const res = await fetch(`/api/setups/${id}`, { method: "DELETE" });
  await readResponse<{ success: true }>(res, "Failed to delete setup");
}

export async function getSetupPromotionCandidates(): Promise<
  JournalPromotionCandidate[]
> {
  const res = await fetch("/api/setups/candidates");
  return readResponse<JournalPromotionCandidate[]>(
    res,
    "Failed to load setup suggestions",
  );
}

export async function getMistakeDefinitions(options?: {
  activeOnly?: boolean;
}): Promise<MistakeDefinition[]> {
  const suffix = options?.activeOnly ? "?active=true" : "";
  const res = await fetch(`/api/mistakes${suffix}`);
  return readResponse<MistakeDefinition[]>(res, "Failed to load mistakes");
}

export async function createMistakeDefinition(
  data: Omit<
    MistakeDefinitionInsert,
    "userId" | "id" | "createdAt" | "updatedAt"
  >,
): Promise<MistakeDefinition> {
  const res = await fetch("/api/mistakes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readResponse<MistakeDefinition>(res, "Failed to create mistake");
}

export async function updateMistakeDefinition(
  id: string,
  data: Partial<
    Omit<MistakeDefinitionInsert, "userId" | "id" | "createdAt" | "updatedAt">
  >,
): Promise<MistakeDefinition> {
  const res = await fetch(`/api/mistakes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readResponse<MistakeDefinition>(res, "Failed to update mistake");
}

export async function deleteMistakeDefinition(id: string): Promise<void> {
  const res = await fetch(`/api/mistakes/${id}`, { method: "DELETE" });
  await readResponse<{ success: true }>(res, "Failed to delete mistake");
}

export async function getMistakePromotionCandidates(): Promise<
  JournalPromotionCandidate[]
> {
  const res = await fetch("/api/mistakes/candidates");
  return readResponse<JournalPromotionCandidate[]>(
    res,
    "Failed to load mistake suggestions",
  );
}

export async function getJournalTemplates(options?: {
  activeOnly?: boolean;
}): Promise<JournalTemplate[]> {
  const suffix = options?.activeOnly ? "?active=true" : "";
  const res = await fetch(`/api/templates${suffix}`);
  return readResponse<JournalTemplate[]>(res, "Failed to load templates");
}

export async function createJournalTemplate(
  data: Omit<
    JournalTemplateInsert,
    "userId" | "id" | "createdAt" | "updatedAt"
  >,
): Promise<JournalTemplate> {
  const res = await fetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readResponse<JournalTemplate>(res, "Failed to create template");
}

export async function updateJournalTemplate(
  id: string,
  data: Partial<
    Omit<JournalTemplateInsert, "userId" | "id" | "createdAt" | "updatedAt">
  >,
): Promise<JournalTemplate> {
  const res = await fetch(`/api/templates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readResponse<JournalTemplate>(res, "Failed to update template");
}

export async function deleteJournalTemplate(id: string): Promise<void> {
  const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
  await readResponse<{ success: true }>(res, "Failed to delete template");
}

export async function getRuleSets(options?: {
  activeOnly?: boolean;
}): Promise<RuleSetWithItems[]> {
  const suffix = options?.activeOnly ? "?active=true" : "";
  const res = await fetch(`/api/rulebooks${suffix}`);
  return readResponse<RuleSetWithItems[]>(res, "Failed to load rulebooks");
}

export async function createRuleSet(
  data: Omit<RuleSetInsert, "userId" | "id" | "createdAt" | "updatedAt"> & {
    items: RuleSetItemPayload[];
  },
): Promise<RuleSetWithItems> {
  const res = await fetch("/api/rulebooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readResponse<RuleSetWithItems>(res, "Failed to create rulebook");
}

export async function updateRuleSet(
  id: string,
  data: Partial<
    Omit<RuleSetInsert, "userId" | "id" | "createdAt" | "updatedAt">
  > & {
    items?: RuleSetItemPayload[];
  },
): Promise<RuleSetWithItems> {
  const res = await fetch(`/api/rulebooks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readResponse<RuleSetWithItems>(res, "Failed to update rulebook");
}

export async function deleteRuleSet(id: string): Promise<void> {
  const res = await fetch(`/api/rulebooks/${id}`, { method: "DELETE" });
  await readResponse<{ success: true }>(res, "Failed to delete rulebook");
}
