-- ============================================================
-- iCHOOM Agent Phone System
-- Contacts · Chrome Chat · CallJack · EddieWire
-- ============================================================

-- ---------- CONTACTS ----------
create table if not exists agent_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_character_id uuid not null references characters(id) on delete cascade,
  contact_type text not null check (contact_type in ('player','npc')),
  contact_player_id uuid references characters(id) on delete cascade,
  contact_npc_id uuid references npcs(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  added_at timestamptz default now(),
  constraint exactly_one_ref check (
    (contact_type = 'player' and contact_player_id is not null and contact_npc_id is null)
    or
    (contact_type = 'npc' and contact_npc_id is not null and contact_player_id is null)
  ),
  unique (owner_character_id, contact_player_id, contact_npc_id)
);

create index if not exists idx_agent_contacts_owner on agent_contacts(owner_character_id);

-- ---------- NPC CODES ----------
create table if not exists agent_npc_codes (
  id uuid primary key default gen_random_uuid(),
  npc_id uuid not null references npcs(id) on delete cascade unique,
  code text not null unique,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- ---------- THREADS (1:1 conversation) ----------
-- canonical ordering (a < b) so each pair has exactly one thread
create table if not exists agent_threads (
  id uuid primary key default gen_random_uuid(),
  a_type text not null check (a_type in ('player','npc')),
  a_id uuid not null,
  b_type text not null check (b_type in ('player','npc')),
  b_id uuid not null,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (a_type, a_id, b_type, b_id)
);

create index if not exists idx_agent_threads_a on agent_threads(a_type, a_id);
create index if not exists idx_agent_threads_b on agent_threads(b_type, b_id);

-- ---------- MESSAGES ----------
create table if not exists agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references agent_threads(id) on delete cascade,
  sender_type text not null check (sender_type in ('player','npc')),
  sender_id uuid not null,
  content text,
  image_url text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_agent_messages_thread on agent_messages(thread_id, created_at);

-- ---------- CALLS ----------
create table if not exists agent_calls (
  id uuid primary key default gen_random_uuid(),
  caller_type text not null check (caller_type in ('player','npc')),
  caller_id uuid not null,
  callee_type text not null check (callee_type in ('player','npc')),
  callee_id uuid not null,
  status text not null default 'ringing'
    check (status in ('ringing','answered','missed','declined','ended')),
  started_at timestamptz default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_sec int default 0
);

create index if not exists idx_agent_calls_caller on agent_calls(caller_type, caller_id, started_at desc);
create index if not exists idx_agent_calls_callee on agent_calls(callee_type, callee_id, started_at desc);

-- ---------- TRANSFERS ----------
-- direction 'send'   : sender pushes money (status='auto' = applied instantly)
-- direction 'request': sender asks money (status starts 'pending' → 'accepted'/'declined')
create table if not exists agent_transfers (
  id uuid primary key default gen_random_uuid(),
  sender_type text not null check (sender_type in ('player','npc')),
  sender_id uuid not null,
  recipient_type text not null check (recipient_type in ('player','npc')),
  recipient_id uuid not null,
  amount int not null check (amount > 0),
  direction text not null default 'send' check (direction in ('send','request')),
  status text not null default 'auto' check (status in ('pending','accepted','declined','auto')),
  note text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists idx_agent_transfers_sender on agent_transfers(sender_type, sender_id, created_at desc);
create index if not exists idx_agent_transfers_recipient on agent_transfers(recipient_type, recipient_id, created_at desc);

-- ============================================================
-- TRIGGER 1: Auto-add new players as contacts to everyone
-- ============================================================
create or replace function agent_add_player_contacts()
returns trigger as $$
begin
  -- new player → all existing players add them
  insert into agent_contacts (owner_character_id, contact_type, contact_player_id, display_name, avatar_url)
  select c.id, 'player', new.id, coalesce(new.handle, new.name), new.image_url
  from characters c where c.id <> new.id
  on conflict do nothing;

  -- new player gets all existing players
  insert into agent_contacts (owner_character_id, contact_type, contact_player_id, display_name, avatar_url)
  select new.id, 'player', c.id, coalesce(c.handle, c.name), c.image_url
  from characters c where c.id <> new.id
  on conflict do nothing;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_agent_add_player_contacts on characters;
create trigger trg_agent_add_player_contacts
after insert on characters
for each row execute function agent_add_player_contacts();

-- ============================================================
-- TRIGGER 2: Auto-update thread.last_message_at on new message
-- ============================================================
create or replace function agent_bump_thread()
returns trigger as $$
begin
  update agent_threads set last_message_at = new.created_at where id = new.thread_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_agent_bump_thread on agent_messages;
create trigger trg_agent_bump_thread
after insert on agent_messages
for each row execute function agent_bump_thread();

-- ============================================================
-- TRIGGER 3: Apply transfer to character cash
-- - 'auto'  : on insert
-- - 'accepted' (for requests): on update from 'pending' → 'accepted'
-- ============================================================
create or replace function agent_apply_transfer()
returns trigger as $$
declare
  v_apply boolean := false;
begin
  if tg_op = 'INSERT' and new.status = 'auto' then
    v_apply := true;
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    v_apply := true;
    new.resolved_at := now();
  end if;

  if not v_apply then return new; end if;

  if new.direction = 'send' then
    -- sender → recipient
    if new.sender_type = 'player' then
      update characters set cash = cash - new.amount where id = new.sender_id;
    end if;
    if new.recipient_type = 'player' then
      update characters set cash = cash + new.amount where id = new.recipient_id;
    end if;
  else  -- 'request': sender is the requester (gets paid), recipient pays
    if new.sender_type = 'player' then
      update characters set cash = cash + new.amount where id = new.sender_id;
    end if;
    if new.recipient_type = 'player' then
      update characters set cash = cash - new.amount where id = new.recipient_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_agent_apply_transfer on agent_transfers;
create trigger trg_agent_apply_transfer
before insert or update on agent_transfers
for each row execute function agent_apply_transfer();

-- ============================================================
-- HELPER: get_or_create_thread(type1, id1, type2, id2) → uuid
-- ============================================================
create or replace function agent_get_or_create_thread(
  p1_type text, p1_id uuid, p2_type text, p2_id uuid
) returns uuid as $$
declare
  va_type text; va_id uuid;
  vb_type text; vb_id uuid;
  v_id uuid;
begin
  -- canonical ordering
  if (p1_type, p1_id) < (p2_type, p2_id) then
    va_type := p1_type; va_id := p1_id; vb_type := p2_type; vb_id := p2_id;
  else
    va_type := p2_type; va_id := p2_id; vb_type := p1_type; vb_id := p1_id;
  end if;

  select id into v_id from agent_threads
    where a_type = va_type and a_id = va_id and b_type = vb_type and b_id = vb_id;

  if v_id is null then
    insert into agent_threads (a_type, a_id, b_type, b_id)
      values (va_type, va_id, vb_type, vb_id) returning id into v_id;
  end if;

  return v_id;
end;
$$ language plpgsql;

-- ============================================================
-- SEED: backfill contacts for existing players
-- ============================================================
insert into agent_contacts (owner_character_id, contact_type, contact_player_id, display_name, avatar_url)
select a.id, 'player', b.id, coalesce(b.handle, b.name), b.image_url
from characters a, characters b
where a.id <> b.id
on conflict do nothing;

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table agent_contacts;
alter publication supabase_realtime add table agent_npc_codes;
alter publication supabase_realtime add table agent_threads;
alter publication supabase_realtime add table agent_messages;
alter publication supabase_realtime add table agent_calls;
alter publication supabase_realtime add table agent_transfers;

-- ============================================================
-- Group Calls — Punkt 4: iCHOOM Gruppen-Anruf
-- ============================================================
alter table agent_calls add column if not exists group_id uuid;
alter table agent_calls add column if not exists started_at_ingame timestamptz;
create index if not exists idx_agent_calls_group_id on agent_calls (group_id);

