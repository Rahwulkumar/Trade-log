import { z } from 'zod';

const mt5ResetSyncSchema = z
  .object({
    reason: z
      .enum(['manual_reset', 'reconnect', 'archive_account', 'delete_account'])
      .optional(),
  })
  .strict();

export function parseMt5ResetSyncPayload(
  raw: unknown,
): ReturnType<typeof mt5ResetSyncSchema.safeParse> {
  return mt5ResetSyncSchema.safeParse(raw);
}
