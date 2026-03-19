'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { usePropAccount } from '@/components/prop-account-provider';
import { Button } from '@/components/ui/button';

interface AnalyticsControlsProps {
  currentAccount: string;
  currentFrom: string | null;
  currentTo: string | null;
  timeZone: string;
}

export function AnalyticsControls({
  currentAccount,
  currentFrom,
  currentTo,
  timeZone,
}: AnalyticsControlsProps) {
  const stateKey = `${currentAccount}|${currentFrom ?? ''}|${currentTo ?? ''}`;

  return (
    <AnalyticsControlsForm
      key={stateKey}
      currentAccount={currentAccount}
      currentFrom={currentFrom}
      currentTo={currentTo}
      timeZone={timeZone}
    />
  );
}

function AnalyticsControlsForm({
  currentAccount,
  currentFrom,
  currentTo,
  timeZone,
}: AnalyticsControlsProps) {
  const { propAccounts } = usePropAccount();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [account, setAccount] = useState(currentAccount);
  const [from, setFrom] = useState(currentFrom ?? '');
  const [to, setTo] = useState(currentTo ?? '');

  const navigateWith = (nextAccount: string, nextFrom: string, nextTo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('account', nextAccount || 'all');
    if (nextFrom) params.set('from', nextFrom);
    else params.delete('from');
    if (nextTo) params.set('to', nextTo);
    else params.delete('to');

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
            Account Scope
          </span>
          <select
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            className="h-10 rounded-xl px-3 text-sm outline-none"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="all">All Accounts</option>
            <option value="unassigned">Unassigned Trades</option>
            {propAccounts.map((propAccount) => (
              <option key={propAccount.id} value={propAccount.id}>
                {propAccount.accountName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
            From
          </span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-10 rounded-xl px-3 text-sm outline-none"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
            To
          </span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-10 rounded-xl px-3 text-sm outline-none"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        <div className="flex flex-col justify-end gap-2 sm:flex-row lg:flex-col">
          <Button
            type="button"
            onClick={() => navigateWith(account, from, to)}
            disabled={isPending || Boolean(from && to && from > to)}
          >
            {isPending ? 'Applying...' : 'Apply'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAccount('all');
              setFrom('');
              setTo('');
              navigateWith('all', '', '');
            }}
            disabled={isPending}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span
          className="rounded-full px-2.5 py-1"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          Timezone: {timeZone}
        </span>
        <span>Entry-day and hourly charts use this timezone.</span>
        <span>Session buckets stay aligned to UTC market sessions.</span>
        <Link href="/settings" className="underline underline-offset-4">
          Update timezone in settings
        </Link>
      </div>
    </div>
  );
}
