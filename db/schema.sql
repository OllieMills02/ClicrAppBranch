-- CLICR PLATFORM - SUPABASE SCHEMA (POSTGRES)
-- Generated for Production Readiness

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ENUMS
create type user_role as enum ('OWNER', 'MANAGER', 'STAFF', 'VIEWER');
create type device_type as enum ('MOBILE', 'FIXED_SCANNER', 'COUNTER_ONLY');
create type flow_type as enum ('IN', 'OUT');
create type scan_result as enum ('ACCEPTED', 'DENIED', 'BANNED', 'UNDERAGE', 'EXPIRED');

-- 3. TABLES

-- BUSINESSES (Tenants)
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique, -- for subdomain or url routing
  timezone text default 'UTC',
  day_cutoff_hour int default 6, -- 6 AM
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  settings jsonb default '{}'::jsonb -- For branding, custom retained settings
);

-- PROFILES (Users)
-- Links to Supabase Auth.users via id
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid references businesses(id),
  role user_role default 'STAFF',
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz default now()
);

-- VENUES
create table venues (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) not null,
  name text not null,
  address text,
  total_capacity int default 0,
  timezone text, -- Override business timezone if needed
  created_at timestamptz default now()
);

-- AREAS (Zones)
create table areas (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid references venues(id) on delete cascade not null,
  name text not null,
  capacity int default 0,
  parent_area_id uuid references areas(id), -- For hierarchy (Room inside a Venue)
  color text default 'blue',
  created_at timestamptz default now()
);

-- DEVICES
create table devices (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) not null,
  venue_id uuid references venues(id), -- Can be null if unassigned
  area_id uuid references areas(id),
  name text not null,
  device_type device_type default 'MOBILE',
  pairing_code text unique, -- For initial setup
  is_active boolean default true,
  last_heartbeat timestamptz,
  version text,
  config jsonb default '{}'::jsonb, -- Split view settings, etc.
  created_at timestamptz default now()
);

-- SCAN LOGS (High Volume)
create table scan_logs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) not null,
  venue_id uuid references venues(id) not null,
  device_id uuid references devices(id),
  timestamp timestamptz default now(),
  
  -- Demographics (Anonymized/Aggregated Safe)
  age int,
  gender text,
  zip_code text,
  
  -- Identity (Sensitive - RLS Protected)
  scan_result scan_result not null,
  id_hash text not null, -- SHA256 of license number for banning matches
  encrypted_pii text, -- Optional: Name, full DOB, Address (Encrypted at app level preferred)
  
  created_at timestamptz default now()
);

-- OCCUPANCY EVENTS (High Volume)
create table occupancy_events (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) not null,
  venue_id uuid references venues(id) not null,
  area_id uuid references areas(id),
  device_id uuid references devices(id),
  
  timestamp timestamptz default now(),
  flow_type flow_type not null, -- IN / OUT
  delta int not null, -- usually 1 or -1, but can be bulk adjust
  event_type text not null, -- 'TAP', 'SCAN', 'BULK_ADJUST', 'SYSTEM_RESET'
  
  session_id text -- Linking entry/exit pairs if possible
);

-- BANS
create table bans (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) not null,
  id_hash text not null, -- Matches scan_logs.id_hash
  
  first_name text,
  last_name text,
  photo_url text, -- Storage bucket path
  reason text,
  active boolean default true,
  expires_at timestamptz,
  
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- AUDIT LOGS
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) not null,
  actor_id uuid references profiles(id),
  action text not null, -- 'CREATE_VENUE', 'BAN_GUEST', 'EXPORT_DATA'
  details jsonb,
  created_at timestamptz default now()
);


-- 4. INDEXES (Performance)
create index idx_occupancy_venue_time on occupancy_events(venue_id, timestamp desc);
create index idx_occupancy_area_time on occupancy_events(area_id, timestamp desc);
create index idx_scans_venue_time on scan_logs(venue_id, timestamp desc);
create index idx_bans_hash on bans(business_id, id_hash);
create index idx_devices_heartbeat on devices(last_heartbeat);

-- 5. RLS POLICIES (Templates)
-- Enable RLS on all tables
alter table businesses enable row level security;
alter table venues enable row level security;
alter table scan_logs enable row level security;

-- Example Policy: Users can only see data for their matching business_id
-- create policy "View own business data" on venues
--   for select using (business_id in (select business_id from profiles where id = auth.uid()));
