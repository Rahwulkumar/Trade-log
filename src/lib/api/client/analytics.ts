import type { AnalyticsPayload } from '@/lib/analytics/types';
import { readJsonIfAvailable } from '@/lib/api/client/http';

const ANALYTICS_CACHE_TTL_MS = 15_000;
const analyticsResponseCache = new Map<
  string,
  { expiresAt: number; data: AnalyticsPayload | null }
>();
const pendingAnalyticsRequests = new Map<
  string,
  Promise<AnalyticsPayload | null>
>();

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

function getCacheKey(filters: AnalyticsClientFilters): string {
  return `/api/analytics${buildQueryString(filters)}`;
}

function clearAnalyticsQueryCache() {
  analyticsResponseCache.clear();
  pendingAnalyticsRequests.clear();
}

export function invalidateAnalyticsCache() {
  clearAnalyticsQueryCache();
}

export async function getAnalyticsPayloadClient(
  filters: AnalyticsClientFilters = {},
): Promise<AnalyticsPayload | null> {
  const cacheKey = getCacheKey(filters);
  const now = Date.now();
  const cached = analyticsResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const pending = pendingAnalyticsRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const res = await fetch(cacheKey, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await readJsonIfAvailable<AnalyticsPayload>(res)) ?? null;
      analyticsResponseCache.set(cacheKey, {
        expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS,
        data,
      });
      return data;
    } catch {
      return null;
    } finally {
      pendingAnalyticsRequests.delete(cacheKey);
    }
  })();

  pendingAnalyticsRequests.set(cacheKey, request);

  try {
    return await request;
  } catch {
    return null;
  }
}
