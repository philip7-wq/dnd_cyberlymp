-- ============================================================
-- ROLES SYSTEM — Cyberpunk RED Playbook-aligned
-- Persistiert: Crafted Items, Action-Log, Class-Ability State
-- ============================================================

-- Generic role inventory: drugs, programs, projects, contacts, fans, vehicles, ...
create table if not exists role_inventory (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  category text not null,
  -- 'drug','program','project','invention','contact','vehicle','team_member',
  -- 'fan','story','intel','architecture','specialty'
  name text not null,
  description text,
  charges int default 1,
  max_charges int default 1,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_role_inv_char on role_inventory(character_id, category);

-- Action log
create table if not exists role_actions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  role_name text not null,
  action text not null,
  target_type text,
  target_id uuid,
  target_name text,
  roll jsonb default '{}'::jsonb,
  result_summary text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_role_actions_char on role_actions(character_id, created_at desc);

-- Realtime
alter publication supabase_realtime add table role_inventory;
alter publication supabase_realtime add table role_actions;
