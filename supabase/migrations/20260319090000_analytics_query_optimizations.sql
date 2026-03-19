alter table public.trades
  add column if not exists pnl_includes_costs boolean not null default true;

update public.trades
set pnl_includes_costs = false
where mt5_account_id is not null;

create index if not exists prop_accounts_user_status_idx
  on public.prop_accounts (user_id, status);

create index if not exists trades_user_status_exit_idx
  on public.trades (user_id, status, exit_date);

create index if not exists trades_user_status_prop_exit_idx
  on public.trades (user_id, status, prop_account_id, exit_date);

create index if not exists trades_mt5_account_external_deal_idx
  on public.trades (mt5_account_id, external_deal_id);

create index if not exists trades_mt5_account_external_id_idx
  on public.trades (mt5_account_id, external_id);
