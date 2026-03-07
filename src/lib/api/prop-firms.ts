import type { PropFirm, PropFirmChallenge, CreateAccountFromChallengeParams } from "@/lib/types/prop-firms";

/**
 * Fetch all active prop firms (via API / Drizzle)
 */
export async function getPropFirms(): Promise<PropFirm[]> {
  const res = await fetch("/api/prop-firms", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch prop firms");
  return res.json();
}

/**
 * Fetch challenges for a specific firm (via API / Drizzle)
 */
export async function getFirmChallenges(firmId: string): Promise<PropFirmChallenge[]> {
  const res = await fetch(`/api/prop-firms/${firmId}/challenges`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch challenges");
  return res.json();
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
  const challenge = await challengeRes.json();

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
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? "Failed to create prop account");
  }
  return res.json();
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
