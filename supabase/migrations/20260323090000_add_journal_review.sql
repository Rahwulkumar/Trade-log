alter table trades
add column if not exists journal_review jsonb not null default '{}'::jsonb;
