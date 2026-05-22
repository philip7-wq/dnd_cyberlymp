-- ============================================================
-- LZRV D&D Hub — Cyberpunk RED Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ---------- CHARACTERS ----------
create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,                  -- Handle / character name shown in dropdown
  handle text,
  role text,                           -- Solo, Netrunner, Tech, etc.
  player_name text,
  image_url text,                      -- Supabase Storage URL

  -- Core stats
  stats jsonb not null default '{}',   -- {INT, REF, DEX, TECH, COOL, WILL, MOVE, BODY, EMP, LUCK}

  -- Combat & resources (denormalized for fast DM-dashboard reads)
  current_hp int default 0,
  max_hp int default 0,
  current_humanity int default 0,
  max_humanity int default 0,
  current_luck int default 0,
  max_luck int default 0,
  seriously_wounded_threshold int default 0,
  death_save int default 0,
  cash int default 0,
  improvement_points int default 0,
  role_ability_rank int default 0,
  reputation int default 0,

  -- Big jsonb blobs (mirror character sheet sections)
  skills jsonb default '{}',           -- { "Handgun": {lvl: 4, stat: "REF"}, ... }
  weapons jsonb default '[]',          -- [{name, dmg, ammo, rof, notes}]
  armor jsonb default '{}',            -- {head: {sp, penalty}, body: {...}, shield: {...}}
  gear jsonb default '[]',             -- [{name, notes, item_id?}]
  cyberware jsonb default '{}',        -- {neuralLink: {has, slots:[]}, rightEye: {...}, ...}
  lifepath jsonb default '{}',         -- {culturalOrigins, personality, friends:[], enemies:[], ...}

  -- Status text
  critical_injuries text,
  mortally_wounded boolean default false,
  conditions jsonb default '[]',
  death_save_penalty int default 0,
  addictions text,
  notes text,
  session_notes text default '',         -- player's own session notes (auto-saved)
  buffs jsonb default '[]',             -- [{id, name, effect, expires_at, duration_label}]

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_characters_name on characters(name);

-- ---------- ITEMS (shop / reference data) ----------
create table if not exists items (
  id text primary key,
  name text not null,
  category text not null,
  subcategory text,
  price int,
  price_options jsonb,
  currency text,
  price_category text,
  raw_cost text,
  damage text,
  rof int,
  hands text,
  ammo text,
  notes text,
  source jsonb,                        -- {page, pdf_page}
  extra jsonb default '{}',            -- everything else (sp, magazine, install, humanity_loss, etc.)
  created_at timestamptz default now()
);

create index if not exists idx_items_category on items(category);
create index if not exists idx_items_subcategory on items(subcategory);
create index if not exists idx_items_name on items(name);

-- ---------- ROLLS (live roll log) ----------
create table if not exists rolls (
  id bigserial primary key,
  character_id uuid references characters(id) on delete cascade,
  character_name text,                 -- denormalized for fast display
  expression text not null,            -- "1d10+7" or "3d6"
  individual_rolls jsonb,              -- [{die: 10, value: 7}, ...]
  modifier int default 0,
  total int not null,
  context text,                        -- "Handgun skill check", "Medium Pistol damage"
  is_crit_success boolean default false,
  is_crit_failure boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_rolls_character on rolls(character_id);
create index if not exists idx_rolls_created on rolls(created_at desc);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists characters_updated_at on characters;
create trigger characters_updated_at
before update on characters
for each row execute function set_updated_at();

-- ---------- COMBAT SESSIONS ----------
create table if not exists combat_sessions (
  id uuid primary key default gen_random_uuid(),
  is_active boolean default false,
  round int default 1,
  current_turn_index int default 0,
  combatants jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists combat_sessions_updated_at on combat_sessions;
create trigger combat_sessions_updated_at
before update on combat_sessions
for each row execute function set_updated_at();

-- ---------- REALTIME ----------
-- Enables WebSocket subscriptions for live DM dashboard
alter publication supabase_realtime add table characters;
alter publication supabase_realtime add table rolls;
alter publication supabase_realtime add table combat_sessions;

-- ---------- ROW LEVEL SECURITY ----------
-- Friend group → permissive policies (shared-PIN auth is client-side only).
-- For a real public app, replace with proper Supabase Auth + per-user policies.
alter table characters     enable row level security;
alter table items          enable row level security;
alter table rolls          enable row level security;
alter table combat_sessions enable row level security;

drop policy if exists "anon all characters" on characters;
create policy "anon all characters" on characters
  for all using (true) with check (true);

drop policy if exists "anon read items" on items;
create policy "anon read items" on items
  for select using (true);

drop policy if exists "anon all rolls" on rolls;
create policy "anon all rolls" on rolls
  for all using (true) with check (true);

drop policy if exists "anon all combat" on combat_sessions;
create policy "anon all combat" on combat_sessions
  for all using (true) with check (true);

-- ---------- GRANTS ----------
-- service_role: seed script + admin ops
grant all on public.characters      to service_role;
grant all on public.items           to service_role;
grant all on public.rolls           to service_role;
grant all on public.combat_sessions to service_role;
grant usage, select on sequence rolls_id_seq to service_role;

-- anon + authenticated: client-side app (browser)
grant all on public.characters      to anon, authenticated;
grant select on public.items        to anon, authenticated;
grant all on public.rolls           to anon, authenticated;
grant all on public.combat_sessions to anon, authenticated;
grant usage, select on sequence rolls_id_seq to anon, authenticated;

-- ---------- STORAGE BUCKET (character portraits) ----------
insert into storage.buckets (id, name, public)
values ('character-images', 'character-images', true)
on conflict (id) do nothing;

drop policy if exists "anon all character images" on storage.objects;
create policy "anon all character images" on storage.objects
  for all using (bucket_id = 'character-images')
  with check (bucket_id = 'character-images');

-- ============================================================
-- MIGRATIONS — Priorität 2 (manuell in Supabase ausführen)
-- ============================================================

-- 2.A: NPC-Gruppen
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS group_name  text;
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS group_color text DEFAULT '#FF2D2D';

-- 2.B: Cash-Log
ALTER TABLE characters ADD COLUMN IF NOT EXISTS cash_log jsonb DEFAULT '[]';

-- 2.C: Raum-Inventar
CREATE TABLE IF NOT EXISTS room_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          text REFERENCES items(id) ON DELETE SET NULL,
  item_name        text NOT NULL,
  item_data        jsonb DEFAULT '{}',
  placed_by        text,
  room_description text DEFAULT 'Aktueller Raum',
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE room_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon all room_items" ON room_items;
CREATE POLICY "anon all room_items" ON room_items FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE room_items;
