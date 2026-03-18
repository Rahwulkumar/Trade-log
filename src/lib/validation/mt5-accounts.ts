import { z } from 'zod';
import { nullableNumericNumber, trimmedString, uuidSchema } from '@/lib/validation/common';

type JsonRecord = Record<string, unknown>;

const mt5AccountCreateSchema = z
  .object({
    propAccountId: uuidSchema,
    server: trimmedString(255).min(1),
    login: trimmedString(128).min(1),
    password: trimmedString(255).min(1),
    currentBalance: nullableNumericNumber.optional(),
  })
  .strict();

function normalizeMt5AccountPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }

  const source = raw as JsonRecord;
  const normalized: JsonRecord = { ...source };

  if (normalized.propAccountId === undefined && source.prop_account_id !== undefined) {
    normalized.propAccountId = source.prop_account_id;
  }
  if (normalized.currentBalance === undefined && source.current_balance !== undefined) {
    normalized.currentBalance = source.current_balance;
  }
  delete normalized.prop_account_id;
  delete normalized.current_balance;

  return normalized;
}

export function parseMt5AccountCreatePayload(
  raw: unknown,
): ReturnType<typeof mt5AccountCreateSchema.safeParse> {
  return mt5AccountCreateSchema.safeParse(normalizeMt5AccountPayload(raw));
}
