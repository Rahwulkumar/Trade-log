import { z } from 'zod';
import {
  dateOnlyString,
  nullableString,
  numericString,
  positiveNumericString,
  trimmedString,
  uuidSchema,
} from '@/lib/validation/common';

type JsonRecord = Record<string, unknown>;

const currentBalanceSchema = z.union([
  numericString.refine((value) => Number(value) >= 0, 'Expected a non-negative numeric value'),
  z.null(),
]);

const propAccountSchema = z
  .object({
    accountName: trimmedString(160).min(1),
    firmName: nullableString(160).optional(),
    accountSize: positiveNumericString,
    currentBalance: currentBalanceSchema.optional(),
    startDate: dateOnlyString.optional(),
    endDate: dateOnlyString.optional(),
    status: nullableString(32).optional(),
    challengeId: z.union([uuidSchema, z.null()]).optional(),
    webhookKey: nullableString(255).optional(),
    currentPhaseStatus: nullableString(64).optional(),
  })
  .strict();

const propAccountUpdateSchema = propAccountSchema.partial();

function normalizePropAccountPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }

  const source = raw as JsonRecord;
  const normalized: JsonRecord = { ...source };
  const aliases: Record<string, string> = {
    account_name: 'accountName',
    firm_name: 'firmName',
    account_size: 'accountSize',
    current_balance: 'currentBalance',
    start_date: 'startDate',
    end_date: 'endDate',
    challenge_id: 'challengeId',
    webhook_key: 'webhookKey',
    current_phase_status: 'currentPhaseStatus',
    name: 'accountName',
    firm: 'firmName',
  };

  for (const [from, to] of Object.entries(aliases)) {
    if (normalized[to] === undefined && source[from] !== undefined) {
      normalized[to] = source[from];
    }
    delete normalized[from];
  }

  if (
    (normalized.accountName === undefined || normalized.accountName === null || normalized.accountName === '') &&
    typeof normalized.firmName === 'string' &&
    normalized.firmName.trim()
  ) {
    normalized.accountName = normalized.firmName;
  }

  return normalized;
}

export function parsePropAccountCreatePayload(
  raw: unknown,
): ReturnType<typeof propAccountSchema.safeParse> {
  return propAccountSchema.safeParse(normalizePropAccountPayload(raw));
}

export function parsePropAccountUpdatePayload(
  raw: unknown,
): ReturnType<typeof propAccountUpdateSchema.safeParse> {
  return propAccountUpdateSchema.safeParse(normalizePropAccountPayload(raw));
}
