'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { usePropAccount } from '@/components/prop-account-provider';
import {
  ControlSurface,
  FieldGroup,
} from '@/components/ui/control-primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const { propAccounts, setSelectedAccountId } = usePropAccount();
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

  const syncProviderSelection = (value: string) => {
    setSelectedAccountId(value === 'all' ? null : value);
  };

  return (
    <ControlSurface className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
        <FieldGroup label="Account Scope" className="space-y-1.5">
          <Select
            value={account}
            onValueChange={(value) => {
              setAccount(value);
              syncProviderSelection(value);
            }}
          >
            <SelectTrigger
              className="h-10 w-full rounded-xl text-sm"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <SelectValue placeholder="Select account scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              <SelectItem value="unassigned">Unassigned Trades</SelectItem>
              {propAccounts.map((propAccount) => (
                <SelectItem key={propAccount.id} value={propAccount.id}>
                  {propAccount.accountName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>

        <FieldGroup label="From" className="space-y-1.5">
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-10 rounded-xl text-sm"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </FieldGroup>

        <FieldGroup label="To" className="space-y-1.5">
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-10 rounded-xl text-sm"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </FieldGroup>

        <div className="flex flex-col justify-end gap-2 sm:flex-row lg:flex-col">
          <Button
            type="button"
            onClick={() => {
              syncProviderSelection(account);
              navigateWith(account, from, to);
            }}
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
              syncProviderSelection('all');
              navigateWith('all', '', '');
            }}
            disabled={isPending}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span
          className="rounded-full px-2.5 py-1"
          style={{
            background: 'var(--surface)',
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
    </ControlSurface>
  );
}
