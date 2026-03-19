import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { AppPanel } from '@/components/ui/page-primitives';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import {
  getAnalyticsPayload,
  normalizeAnalyticsAccountScope,
} from '@/lib/analytics/data';
import { AnalyticsClient } from '@/app/analytics/analytics-client';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return (
      <AppPanel className="mt-8 max-w-md">
        <h2 className="mb-2 text-xl font-semibold">Login Required</h2>
        <p style={{ color: 'var(--text-tertiary)' }} className="mb-4">
          Please sign in to view analytics.
        </p>
        <Button asChild className="mt-4">
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </AppPanel>
    );
  }

  const params = (await searchParams) ?? {};
  const rawAccount = readParam(params.account);
  const accountScope = normalizeAnalyticsAccountScope(rawAccount);
  const payload = await getAnalyticsPayload(userId, {
    accountScope,
    from: readParam(params.from),
    to: readParam(params.to),
    timeZone: readParam(params.timezone),
  });

  return (
    <AnalyticsClient
      payload={payload}
      accountScope={String(accountScope)}
      currentFrom={readParam(params.from)}
      currentTo={readParam(params.to)}
      shouldSyncSelection={!rawAccount}
    />
  );
}
