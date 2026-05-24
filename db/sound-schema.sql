-- Sound Management System
-- Run this entire file in the Supabase SQL Editor.

-- ── sound_library ──────────────────────────────────────────────────────────
create table if not exists sound_library (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  file_path        text not null,
  file_url         text not null,
  category         text not null check (category in ('one-shot','ambiente','music')),
  duration_seconds float,
  size_bytes       int,
  created_at       timestamptz default now()
);

-- ── sound_buttons ──────────────────────────────────────────────────────────
create table if not exists sound_buttons (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sound_id   uuid references sound_library(id) on delete set null,
  category   text not null check (category in ('one-shot','ambiente','music')),
  color      text,
  hotkey     text,
  position   int default 0,
  created_at timestamptz default now()
);

-- ── Grants ─────────────────────────────────────────────────────────────────
grant all on sound_library to anon, authenticated;
grant all on sound_buttons  to anon, authenticated;
