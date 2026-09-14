-- Run this once in Supabase's SQL Editor.
-- If you're upgrading from the earlier version, see the "Upgrading" block
-- at the bottom instead of running this whole file again.

create extension if not exists pgcrypto;

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,          -- short id used in the URL, e.g. 'jetx'
  name text not null,                 -- display name, e.g. "SYM Jet X '24"
  theme_accent text not null default '#e7a33e',  -- hex accent color for this vehicle's pages
  theme_bg text not null default '#0e0f12',      -- hex background color for this vehicle's pages
  vehicle_icon text not null default 'car',      -- 'car' or 'bike'
  tank_capacity numeric,               -- liters, optional but enables the "% of tank" hint
  created_at timestamptz not null default now()
);

create table if not exists fillups (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  date date not null,
  liters numeric not null,
  cost numeric not null,
  odometer numeric,
  odometer_estimated boolean not null default false,  -- true when calculated, not typed in
  is_trip boolean not null default false,
  is_full boolean not null default false,             -- tank was filled all the way
  created_at timestamptz not null default now()
);

create index if not exists fillups_vehicle_idx on fillups(vehicle_id, date desc);

create table if not exists service_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  type text not null,                 -- 'oil' | 'tires' | 'filter' | 'washer' | 'wash' | 'other' | 'general'
  date date not null,
  odometer numeric,
  cost numeric,                       -- optional, mainly used for washes
  note text,
  created_at timestamptz not null default now()
);

create index if not exists service_vehicle_idx on service_entries(vehicle_id, date desc);

-- ============================================================
-- UPGRADE (run this in Supabase's SQL Editor - safe to run once,
-- every statement is if-not-exists / if-not-already-there):
-- adds vehicle documents (plate, VIN, insurance, ΚΤΕΟ + photos)
-- and tags trip-mode expenses (tolls/food) on service_entries.
-- ============================================================
alter table vehicles add column if not exists plate_number text;
alter table vehicles add column if not exists vin text;
alter table vehicles add column if not exists insurance_date date;
alter table vehicles add column if not exists kteo_date date;
alter table vehicles add column if not exists insurance_photo_url text;
alter table vehicles add column if not exists kteo_photo_url text;
alter table vehicles add column if not exists docs_password_hash text;
alter table service_entries add column if not exists is_trip boolean not null default false;

-- Add your vehicles here (edit and run once per vehicle):
-- insert into vehicles (slug, name, theme_accent, theme_bg, vehicle_icon, tank_capacity)
-- values ('peugeot307', 'Peugeot 307 ''02', '#c9313f', '#050505', 'car', 60);
-- insert into vehicles (slug, name, theme_accent, theme_bg, vehicle_icon, tank_capacity)
-- values ('jetx', 'SYM Jet X ''24', '#f2f2f2', '#050505', 'bike', 7.5);
-- insert into vehicles (slug, name, theme_accent, theme_bg, vehicle_icon, tank_capacity)
-- values ('matiz', 'Daewoo Matiz ''00', '#e2323a', '#050505', 'car', 35);

-- ============================================================
-- UPGRADING from the earlier (login-free, fuel-only) version:
-- run only these statements instead of the whole file above.
-- ============================================================
-- alter table vehicles add column if not exists theme_accent text not null default '#e7a33e';
-- alter table vehicles add column if not exists theme_bg text not null default '#0e0f12';
-- alter table vehicles add column if not exists vehicle_icon text not null default 'car';
-- alter table vehicles add column if not exists tank_capacity numeric;
-- alter table fillups add column if not exists odometer_estimated boolean not null default false;
-- alter table fillups add column if not exists is_trip boolean not null default false;
-- alter table fillups add column if not exists is_full boolean not null default false;
-- alter table service_entries add column if not exists cost numeric;
-- create table if not exists service_entries (
--   id uuid primary key default gen_random_uuid(),
--   vehicle_id uuid not null references vehicles(id) on delete cascade,
--   type text not null,
--   date date not null,
--   odometer numeric,
--   note text,
--   created_at timestamptz not null default now()
-- );
-- create index if not exists service_vehicle_idx on service_entries(vehicle_id, date desc);
