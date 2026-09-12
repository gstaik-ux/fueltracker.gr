-- Run this once in your database's SQL editor (Supabase: SQL Editor -> New query)

create extension if not exists pgcrypto;

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,   -- short id used in the URL, e.g. 'civic'
  name text not null,          -- display name, e.g. "Dad's Civic"
  created_at timestamptz not null default now()
);

create table if not exists fillups (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  date date not null,
  liters numeric not null,
  cost numeric not null,
  odometer numeric,
  created_at timestamptz not null default now()
);

create index if not exists fillups_vehicle_idx on fillups(vehicle_id, date desc);

-- Add your vehicles here (edit and run once per vehicle):
-- insert into vehicles (slug, name) values ('civic', 'Dad''s Civic');
-- insert into vehicles (slug, name) values ('yaris', 'Mom''s Yaris');
