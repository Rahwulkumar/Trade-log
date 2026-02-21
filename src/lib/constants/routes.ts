/**
 * Public routes — do not require authentication.
 * Keep in sync with src/lib/supabase/middleware.ts.
 */
export const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
] as const;

/**
 * Client-side API route helpers.
 * Use these instead of constructing strings inline.
 */
export const API_ROUTES = {
  ai: '/api/ai',
  tradesChart: '/api/trades/chart',
  mt5Accounts: '/api/mt5-accounts',
  mt5AccountById: (id: string) => `/api/mt5-accounts/${id}`,
  enableAutoSync: (id: string) => `/api/mt5-accounts/${id}/enable-autosync`,
  disableAutoSync: (id: string) => `/api/mt5-accounts/${id}/disable-autosync`,
  terminalStatus: (id: string) => `/api/mt5-accounts/${id}/terminal-status`,
  terminalStatusByPropAccount: (propAccountId: string) =>
    `/api/mt5-accounts/by-prop-account/${propAccountId}/terminal-status`,
  propAccountsRecalculate: '/api/prop-accounts/recalculate-balance',
} as const;
