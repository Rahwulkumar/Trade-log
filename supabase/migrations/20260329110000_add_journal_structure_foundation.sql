create table if not exists journal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  description text,
  scope_type text not null default 'global',
  playbook_id uuid references playbooks(id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_templates_user_scope_idx
  on journal_templates(user_id, scope_type);

create table if not exists setup_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  playbook_id uuid references playbooks(id) on delete set null,
  default_template_id uuid references journal_templates(id) on delete set null,
  name text not null,
  description text,
  preferred_session text,
  preferred_market_condition text,
  entry_criteria jsonb not null default '[]'::jsonb,
  invalidation_rules text,
  management_notes text,
  example_notes text,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists setup_definitions_user_playbook_idx
  on setup_definitions(user_id, playbook_id);

create table if not exists mistake_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  category text,
  severity text,
  description text,
  correction_guidance text,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mistake_definitions_user_category_idx
  on mistake_definitions(user_id, category);

alter table trades
  add column if not exists setup_definition_id uuid references setup_definitions(id) on delete set null,
  add column if not exists journal_template_id uuid references journal_templates(id) on delete set null,
  add column if not exists mistake_definition_ids jsonb not null default '[]'::jsonb,
  add column if not exists journal_template_snapshot jsonb;
