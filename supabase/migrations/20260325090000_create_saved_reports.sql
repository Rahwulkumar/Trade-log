create table if not exists saved_reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  report_type text not null,
  account_scope text not null default 'all',
  prop_account_id uuid references prop_accounts(id) on delete set null,
  from_date date,
  to_date date,
  include_ai boolean not null default false,
  trade_count integer not null default 0,
  selected_trade_ids jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_reports_user_created_idx
  on saved_reports (user_id, created_at);
