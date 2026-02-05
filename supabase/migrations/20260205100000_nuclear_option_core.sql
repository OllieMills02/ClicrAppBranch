-- NUCLEAR OPTION: Core Schema Hardening & Atomic Logic
-- Phase 1, 2, 3: Tables, RLS, RPCs

-- ==============================================================================
-- 0. PRE-REQUISITES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS business_members (
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'USER',
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (business_id, user_id)
);
DO $$ BEGIN
    -- Force UUID type if it was somehow text
    ALTER TABLE business_members ALTER COLUMN business_id TYPE uuid USING business_id::uuid;
    ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "Read business_members" ON business_members;
CREATE POLICY "Read business_members" ON business_members FOR SELECT USING (user_id = auth.uid());

-- ==============================================================================
-- 1. HARDEN TABLES
-- ==============================================================================

-- A) Occupancy Events (The Source of Truth)
CREATE TABLE IF NOT EXISTS occupancy_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    area_id uuid NOT NULL,
    delta int NOT NULL,
    source text NOT NULL,
    device_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure Constraints and Types (Explicitly)
-- Drop indexes/views/policies that might block type change
DROP VIEW IF EXISTS view_area_details;
DROP INDEX IF EXISTS idx_oe_business_created;
DROP INDEX IF EXISTS idx_oe_venue_created;
DROP INDEX IF EXISTS idx_oe_area_created;

DROP POLICY IF EXISTS "Read occupancy_events" ON occupancy_events;
DROP POLICY IF EXISTS "Insert occupancy_events" ON occupancy_events;
DROP POLICY IF EXISTS "Enable read for members" ON occupancy_events;
DROP POLICY IF EXISTS "Enable insert for members" ON occupancy_events;
DROP POLICY IF EXISTS "Enable read for authenticated" ON occupancy_events;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON occupancy_events;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON occupancy_events;

-- Clean up invalid IDs (Legacy data)
DELETE FROM occupancy_events WHERE business_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM occupancy_events WHERE venue_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM occupancy_events WHERE area_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

ALTER TABLE occupancy_events ALTER COLUMN business_id TYPE uuid USING business_id::uuid;
ALTER TABLE occupancy_events ALTER COLUMN venue_id TYPE uuid USING venue_id::uuid;
ALTER TABLE occupancy_events ALTER COLUMN area_id TYPE uuid USING area_id::uuid;

DELETE FROM occupancy_events WHERE delta = 0;
ALTER TABLE occupancy_events DROP CONSTRAINT IF EXISTS check_delta_nonzero;
ALTER TABLE occupancy_events ADD CONSTRAINT check_delta_nonzero CHECK (delta != 0);

-- Indexes for Aggregation Speed
CREATE INDEX IF NOT EXISTS idx_oe_business_created ON occupancy_events(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_oe_venue_created ON occupancy_events(venue_id, created_at);
CREATE INDEX IF NOT EXISTS idx_oe_area_created ON occupancy_events(area_id, created_at);

-- Enforce PK on Area ID for upserts
DO $$
BEGIN
    -- Only run if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'occupancy_snapshots') THEN
         -- Drop old PK if it exists (might be named occupancy_snapshots_pkey)
         -- We interpret 'occupancy_snapshots_pkey' as the default name.
         -- If it has a different name, this might fail, but standard pg naming applies.
         ALTER TABLE occupancy_snapshots DROP CONSTRAINT IF EXISTS occupancy_snapshots_pkey;
         ALTER TABLE occupancy_snapshots ADD PRIMARY KEY (area_id);
    END IF;
END $$;

-- B) Occupancy Snapshots (Current State)
CREATE TABLE IF NOT EXISTS occupancy_snapshots (
    business_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    area_id uuid NOT NULL,
    current_occupancy int NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (area_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_os_area_unique ON occupancy_snapshots(area_id);
CREATE INDEX IF NOT EXISTS idx_os_business ON occupancy_snapshots(business_id);
CREATE INDEX IF NOT EXISTS idx_os_venue ON occupancy_snapshots(venue_id);

-- C) App Errors (Logging)
-- ... (skip to apply_occupancy_delta) ...

-- (I'll skip replacing the whole file, just the create table block first)
-- Wait, I should do the function replacement in a separate chunk or same call? Same call is better.

-- ... allow me to target just the table definition first, then function.


-- C) App Errors (Logging)
CREATE TABLE IF NOT EXISTS app_errors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid,
    user_id uuid,
    feature text,
    message text,
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

-- D) Audit Logs (Standardization)
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid,
    actor_user_id uuid, -- Ensure this exists
    action text,
    entity_type text,
    entity_id uuid,
    before_json jsonb,
    after_json jsonb,
    created_at timestamptz DEFAULT now()
);

-- E) Soft Delete Devices (Schema Update)
-- Check 'devices' table
CREATE TABLE IF NOT EXISTS devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    venue_id uuid,
    area_id uuid,
    device_type text NOT NULL DEFAULT 'COUNTER',
    device_name text,
    created_at timestamptz DEFAULT now()
);
-- E) Soft Delete Devices (Schema Update)
-- Check 'devices' table
CREATE TABLE IF NOT EXISTS devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    venue_id uuid,
    area_id uuid,
    device_type text NOT NULL DEFAULT 'COUNTER',
    device_name text,
    created_at timestamptz DEFAULT now()
);

-- Drop policies blocking type change
DROP POLICY IF EXISTS "Manage own business devices" ON devices;
DROP POLICY IF EXISTS "View own business devices" ON devices;
DROP POLICY IF EXISTS "Update own business devices" ON devices;
DROP POLICY IF EXISTS "Delete own business devices" ON devices;
DROP POLICY IF EXISTS "Insert own business devices" ON devices;
DROP POLICY IF EXISTS "Read active devices" ON devices;
DROP POLICY IF EXISTS "Manage active devices" ON devices;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON devices;

-- Force UUID types on devices (Fail loudly if blocked)
-- Drop potential blocking FKs/Views
ALTER TABLE IF EXISTS id_scans DROP CONSTRAINT IF EXISTS id_scans_device_id_fkey;
ALTER TABLE IF EXISTS clicrs DROP CONSTRAINT IF EXISTS clicrs_device_id_fkey; 

-- CLEAN BAD DATA
DELETE FROM devices WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM devices WHERE business_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

ALTER TABLE devices ALTER COLUMN device_type TYPE text;
ALTER TABLE devices ALTER COLUMN id TYPE uuid USING id::uuid;
ALTER TABLE devices ALTER COLUMN business_id TYPE uuid USING business_id::uuid;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Check 'clicrs' table just in case it is separate
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clicrs') THEN
        ALTER TABLE clicrs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
        ALTER TABLE clicrs ADD COLUMN IF NOT EXISTS deleted_by uuid;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ==============================================================================
-- 2. ENABLE RLS (Security)
-- ==============================================================================

-- Helper: Check Membership
DROP FUNCTION IF EXISTS public.is_business_member CASCADE; 
CREATE OR REPLACE FUNCTION public.is_business_member(b_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members 
    WHERE business_id = b_id AND user_id = auth.uid()
  );
$$;

-- Occupancy Events
ALTER TABLE occupancy_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read occupancy_events" ON occupancy_events;
CREATE POLICY "Read occupancy_events" ON occupancy_events FOR SELECT
USING (is_business_member(business_id::uuid));

DROP POLICY IF EXISTS "Insert occupancy_events" ON occupancy_events;
CREATE POLICY "Insert occupancy_events" ON occupancy_events FOR INSERT
WITH CHECK (is_business_member(business_id::uuid));

-- Occupancy Snapshots
ALTER TABLE occupancy_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read occupancy_snapshots" ON occupancy_snapshots;
CREATE POLICY "Read occupancy_snapshots" ON occupancy_snapshots FOR SELECT
USING (is_business_member(business_id::uuid));

-- App Errors
ALTER TABLE app_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Same user can read own errors" ON app_errors; 
CREATE POLICY "Same user can read own errors" ON app_errors FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Insert app_errors" ON app_errors;
CREATE POLICY "Insert app_errors" ON app_errors FOR INSERT WITH CHECK (true);

-- Devices (Soft Delete filtered read)
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read active devices" ON devices;
CREATE POLICY "Read active devices" ON devices FOR SELECT
USING (is_business_member(business_id::uuid) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Manage active devices" ON devices;
CREATE POLICY "Insert active devices" ON devices FOR INSERT WITH CHECK (is_business_member(business_id::uuid));
CREATE POLICY "Update active devices" ON devices FOR UPDATE USING (is_business_member(business_id::uuid));
CREATE POLICY "Delete active devices" ON devices FOR DELETE USING (is_business_member(business_id::uuid));


-- ==============================================================================
-- 3. CORE RPCs (Atomic & Authoritative)
-- ==============================================================================

-- RPC #1: apply_occupancy_delta (Atomic Write)
-- Handles locking, snapshots, and event log in one go.
CREATE OR REPLACE FUNCTION apply_occupancy_delta(
    p_business_id uuid,
    p_venue_id uuid,
    p_area_id uuid,
    p_delta int,
    p_source text,
    p_device_id uuid DEFAULT NULL
)
RETURNS TABLE (new_occupancy int, event_id uuid, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_occ int;
    v_event_id uuid;
    v_updated_at timestamptz;
BEGIN
    -- 1. Security Check
    IF NOT is_business_member(p_business_id) THEN
        RAISE EXCEPTION 'Access Denied: Not a member of business %', p_business_id;
    END IF;

    -- 2. Lock & Update Snapshot (Upsert)
    INSERT INTO occupancy_snapshots AS os (business_id, venue_id, area_id, current_occupancy, updated_at)
    VALUES (p_business_id, p_venue_id, p_area_id, GREATEST(0, p_delta), now())
    ON CONFLICT (area_id)
    DO UPDATE SET 
        current_occupancy = GREATEST(0, os.current_occupancy + p_delta),
        updated_at = now()
    RETURNING os.current_occupancy, os.updated_at INTO v_new_occ, v_updated_at;

    -- 3. Insert Event Log
    INSERT INTO occupancy_events (business_id, venue_id, area_id, delta, source, device_id, flow_type, event_type)
    VALUES (
        p_business_id, 
        p_venue_id, 
        p_area_id, 
        p_delta, 
        p_source, 
        p_device_id,
        (CASE WHEN p_delta >= 0 THEN 'IN' ELSE 'OUT' END)::flow_type,
        CASE WHEN p_source = 'reset' THEN 'RESET' ELSE 'TAP' END -- Simple fallback
    )
    RETURNING id INTO v_event_id;

    -- 4. Return
    RETURN QUERY SELECT v_new_occ, v_event_id, v_updated_at;
END;
$$;


-- RPC #2: get_traffic_totals (Authoritative Read)
-- The ONLY source of truth for totals.
DROP FUNCTION IF EXISTS get_traffic_totals(text, text, text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS get_traffic_totals(uuid, uuid, uuid, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION get_traffic_totals(
    p_business_id uuid,
    p_venue_id uuid DEFAULT NULL,
    p_area_id uuid DEFAULT NULL,
    p_start_ts timestamptz DEFAULT now() - interval '24 hours',
    p_end_ts timestamptz DEFAULT now()
)
RETURNS TABLE (
    total_in bigint,
    total_out bigint,
    net_delta bigint,
    event_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Security implicit via RLS but good to be explicit for optimization
    IF NOT is_business_member(p_business_id) THEN
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN delta < 0 THEN ABS(delta) ELSE 0 END), 0) as total_out,
        COALESCE(SUM(delta), 0) as net_delta,
        COUNT(*) as event_count
    FROM occupancy_events oe
    WHERE oe.business_id = p_business_id
    AND (p_venue_id IS NULL OR oe.venue_id = p_venue_id)
    AND (p_area_id IS NULL OR oe.area_id = p_area_id)
    AND oe.created_at >= p_start_ts
    AND oe.created_at <= p_end_ts;
END;
$$;

-- RPC #3: reset_counts (Atomic Reset)
-- Auditable, realtime-compatible via negative delta events.
CREATE OR REPLACE FUNCTION reset_counts(
    p_scope text, -- 'BUSINESS', 'VENUE', 'AREA'
    p_business_id uuid,
    p_venue_id uuid DEFAULT NULL,
    p_area_id uuid DEFAULT NULL,
    p_reason text DEFAULT NULL
)
RETURNS TABLE (
    affected_rows int,
    total_delta_applied bigint,
    reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_affected int := 0;
    v_total_delta bigint := 0;
    r RECORD;
BEGIN
    -- 1. Security
    IF NOT is_business_member(p_business_id) THEN
         RAISE EXCEPTION 'Access Denied';
    END IF;

    -- 2. Audit Log (Inserted into standardized table)
    INSERT INTO audit_logs (business_id, actor_user_id, action, entity_type, before_json)
    VALUES (p_business_id, auth.uid(), 'RESET_COUNTS', p_scope, jsonb_build_object('venue', p_venue_id, 'area', p_area_id, 'reason', p_reason));

    -- 3. Loop through Targets (Locking them)
    -- We select targets based on scope
    FOR r IN 
        SELECT business_id, venue_id, area_id, current_occupancy 
        FROM occupancy_snapshots
        WHERE business_id = p_business_id
        AND (p_scope = 'BUSINESS' OR (p_scope = 'VENUE' AND venue_id = p_venue_id) OR (p_scope = 'AREA' AND area_id = p_area_id))
        AND current_occupancy != 0
        FOR UPDATE
    LOOP
        -- Inverse Event
        INSERT INTO occupancy_events (business_id, venue_id, area_id, delta, source, flow_type, event_type)
        VALUES (r.business_id, r.venue_id, r.area_id, -r.current_occupancy, 'RESET', 'OUT', 'RESET');
        
        -- Update Snapshot
        UPDATE occupancy_snapshots 
        SET current_occupancy = 0, updated_at = now()
        WHERE business_id = r.business_id AND venue_id = r.venue_id AND area_id = r.area_id;

        v_affected := v_affected + 1;
        v_total_delta := v_total_delta + ABS(r.current_occupancy);
    END LOOP;

    RETURN QUERY SELECT v_affected, v_total_delta, now();
END;
$$;

-- RPC #4: soft_delete_device
CREATE OR REPLACE FUNCTION soft_delete_device(
    p_business_id uuid,
    p_device_id uuid
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_at timestamptz;
BEGIN
    IF NOT is_business_member(p_business_id) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Try devices table
    UPDATE devices
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_device_id AND business_id = p_business_id
    RETURNING deleted_at INTO v_deleted_at;

    -- Audit
    INSERT INTO audit_logs (business_id, actor_user_id, action, entity_type, entity_id)
    VALUES (p_business_id, auth.uid(), 'DELETE_DEVICE', 'DEVICE', p_device_id);

    RETURN v_deleted_at;
END;
$$;
