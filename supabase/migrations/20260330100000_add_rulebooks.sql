create table if not exists public.rule_sets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  description text,
  scope_type text not null default 'global',
  playbook_id uuid references public.playbooks(id) on delete set null,
  setup_definition_id uuid references public.setup_definitions(id) on delete set null,
  journal_template_id uuid references public.journal_templates(id) on delete set null,
  prop_account_id uuid references public.prop_accounts(id) on delete set null,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rule_sets_user_scope_idx
  on public.rule_sets(user_id, scope_type);
create index if not exists rule_sets_user_playbook_idx
  on public.rule_sets(user_id, playbook_id);
create index if not exists rule_sets_user_setup_idx
  on public.rule_sets(user_id, setup_definition_id);
create index if not exists rule_sets_user_template_idx
  on public.rule_sets(user_id, journal_template_id);
create index if not exists rule_sets_user_account_idx
  on public.rule_sets(user_id, prop_account_id);

create table if not exists public.rule_set_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  rule_set_id uuid not null references public.rule_sets(id) on delete cascade,
  title text not null,
  description text,
  category text,
  severity text,
  sort_order integer not null default 0,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rule_set_items_rule_set_idx
  on public.rule_set_items(rule_set_id, sort_order);
create index if not exists rule_set_items_user_category_idx
  on public.rule_set_items(user_id, category);

alter table public.trades
  add column if not exists rule_set_id uuid references public.rule_sets(id) on delete set null;

alter table public.trades
  add column if not exists trade_rule_results jsonb not null default '[]'::jsonb;
