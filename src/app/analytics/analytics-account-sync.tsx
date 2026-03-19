'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { usePropAccount } from '@/components/prop-account-provider';

function normalizeProviderSelection(value: string | null): string {
  if (!value) return 'all';
  return value;
}

export function AnalyticsAccountSync({
  account,
  shouldSyncSelection,
}: {
  account: string;
  shouldSyncSelection: boolean;
}) {
  const { selectedAccountId, loading } = usePropAccount();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading || !shouldSyncSelection) return;

    const nextAccount = normalizeProviderSelection(selectedAccountId);
    if (nextAccount === account) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('account', nextAccount);
    router.replace(`${pathname}?${params.toString()}`);
  }, [
    account,
    loading,
    pathname,
    router,
    searchParams,
    selectedAccountId,
    shouldSyncSelection,
  ]);

  return null;
}
