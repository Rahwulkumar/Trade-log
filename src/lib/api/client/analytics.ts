import type { AnalyticsPayload } from '@/lib/analytics/types';
import { readJsonIfAvailable } from '@/lib/api/client/http';

export interface AnalyticsClientFilters {
  account?: string | null;
  from?: string | null;
  to?: string | null;
  timezone?: string | null;
}

function buildQueryString(filters: AnalyticsClientFilters): string {
  const params = new URLSearchParams();
  if (filters.account) params.set('account', filters.account);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.timezone) params.set('timezone', filters.timezone);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function getAnalyticsPayloadClient(
  filters: AnalyticsClientFilters = {},
): Promise<AnalyticsPayload | null> {
  try {
    const res = await fetch(`/api/analytics${buildQueryString(filters)}`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return (await readJsonIfAvailable<AnalyticsPayload>(res)) ?? null;
  } catch {
    return null;
  }
}
