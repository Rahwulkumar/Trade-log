import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const trimmedString = (max: number) => z.string().trim().max(max);

export const nullableString = (max: number) =>
  z.union([z.string(), z.null()]).transform((value) => {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : null;
  });

export const stringArray = (maxItems = 50, maxLength = 120) =>
  z.array(z.string().trim().min(1).max(maxLength)).max(maxItems);

export const nullableStringArray = (maxItems = 50, maxLength = 120) =>
  z.union([stringArray(maxItems, maxLength), z.null()]);

export const numericString = z.union([z.number().finite(), z.string().trim().min(1)]).transform(
  (value, ctx) => {
    const raw = typeof value === 'number' ? String(value) : value.trim();
    if (!Number.isFinite(Number(raw))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected a numeric value',
      });
      return z.NEVER;
    }
    return raw;
  },
);

export const positiveNumericString = numericString.refine(
  (value) => Number(value) > 0,
  'Expected a positive numeric value',
);

export const nullableNumericNumber = z
  .union([z.number().finite(), z.string().trim().min(1), z.null()])
  .transform((value, ctx) => {
    if (value === null) return null;
    const parsed = typeof value === 'number' ? value : Number(value.trim());
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected a numeric value',
      });
      return z.NEVER;
    }
    return parsed;
  });

export const dateOnlyString = z.union([z.string(), z.null()]).transform((value, ctx) => {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expected a date in YYYY-MM-DD format',
    });
    return z.NEVER;
  }
  return trimmed;
});
