create table if not exists trade_chart_cache (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  timeframe text not null,
  symbol text not null,
  candles jsonb not null default '[]'::jsonb,
  source text not null default 'mt5',
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists trade_chart_cache_trade_timeframe_idx
  on trade_chart_cache (trade_id, timeframe);

create index if not exists trade_chart_cache_trade_fetched_idx
  on trade_chart_cache (trade_id, fetched_at);
