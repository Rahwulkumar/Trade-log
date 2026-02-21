/** Application identity */
export const APP_NAME = 'Trading Journal' as const;
export const APP_TAGLINE = 'Trading Journal' as const;

/** Width of the fixed left sidebar. Must match --sidebar-width in globals.css */
export const SIDEBAR_WIDTH_PX = 240;
export const SIDEBAR_WIDTH = `${SIDEBAR_WIDTH_PX}px`;

/** Debounce delay used for all auto-save operations (ms) */
export const AUTOSAVE_DEBOUNCE_MS = 1000;

/** Tailwind mobile breakpoint — must match the `md` breakpoint in tailwind.config */
export const MOBILE_BREAKPOINT_PX = 768;

/** Maximum file size for screenshot uploads (5 MB) */
export const MAX_SCREENSHOT_SIZE_BYTES = 5 * 1024 * 1024;

/** Allowed MIME types for screenshot uploads */
export const ALLOWED_SCREENSHOT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** Supabase storage bucket for trade screenshots */
export const STORAGE_BUCKET = 'trade-screenshots';

/** Number of trades processed per batch during Terminal Farm sync */
export const TRADE_BATCH_SIZE = 50;
