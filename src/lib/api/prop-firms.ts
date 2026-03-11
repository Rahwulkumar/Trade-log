import type { PropFirm, PropFirmChallenge, CreateAccountFromChallengeParams } from "@/lib/types/prop-firms";
import { readJsonIfAvailable } from '@/lib/api/client/http';

/**
 * Fetch all active prop firms (via API / Drizzle)
 */
export async function getPropFirms(): Promise<PropFirm[]> {
  const res = await fetch("/api/prop-firms", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch prop firms");
  return (await readJsonIfAvailable<PropFirm[]>(res)) ?? [];
}

/**
 * Fetch challenges for a specific firm (via API / Drizzle)
 */
export async function getFirmChallenges(firmId: string): Promise<PropFirmChallenge[]> {
  const res = await fetch(`/api/prop-firms/${firmId}/challenges`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch challenges");
  return (await readJsonIfAvailable<PropFirmChallenge[]>(res)) ?? [];
}

/**
 * Create a prop account from a challenge template.
 * Uses POST /api/prop-accounts (Clerk auth); server resolves userId.
 */
export async function createAccountFromChallenge({
  userId: _userId,
  challengeId,
  name,
  startDate,
}: CreateAccountFromChallengeParams): Promise<{ id: string; accountName: string; [key: string]: unknown } | null> {
  const challengeRes = await fetch(`/api/prop-firm-challenges/${challengeId}`, { credentials: "include" });
  if (!challengeRes.ok) throw new Error("Challenge not found");
  const challenge = await readJsonIfAvailable<{ firm?: { name?: string | null }; initial_balance?: number | string | null }>(challengeRes);
  if (!challenge) throw new Error('Challenge response was not valid JSON');

  const firmName = challenge.firm?.name ?? "Unknown Firm";
  const initialBalance = Number(challenge.initial_balance);

  const body = {
    accountName: name,
    firmName,
    accountSize: String(initialBalance),
    currentBalance: String(initialBalance),
    startDate,
    challengeId,
    status: "active",
  };

  const res = await fetch("/api/prop-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await readJsonIfAvailable<{ error?: string }>(res);
    throw new Error(err?.error ?? "Failed to create prop account");
  }
  return await readJsonIfAvailable<{ id: string; accountName: string; [key: string]: unknown }>(res);
}

/**
 * Admin: Upsert a Prop Firm (requires backend implementation if needed)
 */
export async function upsertPropFirm(firm: Partial<PropFirm>) {
  // TODO: implement POST /api/admin/prop-firms if needed
  throw new Error("Not implemented: use API or DB directly");
}

/**
 * Admin: Upsert a Challenge (requires backend implementation if needed)
 */
export async function upsertChallenge(challenge: Partial<PropFirmChallenge>) {
  // TODO: implement POST /api/admin/prop-firm-challenges if needed
  throw new Error("Not implemented: use API or DB directly");
}
