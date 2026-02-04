-- COPY THIS SQL AND RUN IT IN YOUR SUPABASE DASHBOARD SQL EDITOR (https://supabase.com/dashboard)
-- This manually creates ALL critical RPC functions required for Live Occupancy.

-- 1. Ensure Tables Exist
CREATE TABLE IF NOT EXISTS occupancy_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    area_id uuid,
    device_id uuid,
    user_id uuid, -- Optional if we want to track user
    timestamp timestamptz DEFAULT now(),
    delta int NOT NULL,
    flow_type text, -- IN/OUT/RESET
    event_type text, -- clicker/manual/auto
    session_id text
);
CREATE INDEX IF NOT EXISTS idx_occupancy_events_venue ON occupancy_events(venue_id);

CREATE TABLE IF NOT EXISTS occupancy_snapshots (
    area_id uuid PRIMARY KEY,
    business_id uuid NOT NULL, -- Logical Tenant
    venue_id uuid NOT NULL,
    current_occupancy int DEFAULT 0,
    last_event_id uuid,
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_area_snap UNIQUE(area_id)
);
ALTER TABLE occupancy_snapshots ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE occupancy_snapshots;

-- 2. Define process_occupancy_event (The Core Logic)
CREATE OR REPLACE FUNCTION process_occupancy_event(
  p_business_id uuid,
  p_venue_id uuid,
  p_area_id uuid,
  p_device_id text, -- TEXT to match legacy usage
  p_user_id uuid,
  p_delta int,
  p_flow_type text,
  p_event_type text,
  p_session_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_event_id uuid;
  v_current_occ int;
  v_new_occ int;
  v_snap_exists boolean;
  v_safe_device_id uuid;
BEGIN
  -- Safe Cast Device ID
  BEGIN
    v_safe_device_id := p_device_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_safe_device_id := NULL;
  END;

  -- 1. Insert the event
  INSERT INTO occupancy_events (
    business_id, venue_id, area_id, device_id, 
    timestamp, flow_type, delta, event_type, session_id
  ) VALUES (
    p_business_id, p_venue_id, p_area_id, v_safe_device_id,
    now(), p_flow_type, p_delta, p_event_type, p_session_id
  ) RETURNING id INTO v_new_event_id;

  -- 2. Update Snapshot with Explicit Locking
  LOOP
    -- Try to lock existing row
    SELECT TRUE, current_occupancy INTO v_snap_exists, v_current_occ
    FROM occupancy_snapshots 
    WHERE area_id = p_area_id
    FOR UPDATE;

    IF v_snap_exists THEN
      v_new_occ := GREATEST(0, v_current_occ + p_delta);
      UPDATE occupancy_snapshots 
      SET 
        current_occupancy = v_new_occ,
        last_event_id = v_new_event_id,
        updated_at = now()
      WHERE area_id = p_area_id;
      EXIT;
    ELSE
      -- Insert new
      BEGIN
        INSERT INTO occupancy_snapshots (business_id, venue_id, area_id, current_occupancy, last_event_id, updated_at)
        VALUES (p_business_id, p_venue_id, p_area_id, GREATEST(0, p_delta), v_new_event_id, now())
        RETURNING current_occupancy INTO v_new_occ;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'event_id', v_new_event_id,
    'current_occupancy', v_new_occ
  );
END;
$$;

-- 3. Define add_occupancy_delta (Wrapper for simpler calls)
CREATE OR REPLACE FUNCTION add_occupancy_delta(
    p_business_id uuid,
    p_venue_id uuid,
    p_area_id uuid,
    p_device_id text,
    p_delta int,
    p_source text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    v_result := process_occupancy_event(
        p_business_id,
        p_venue_id,
        p_area_id,
        p_device_id,
        auth.uid(), 
        p_delta,
        CASE WHEN p_delta > 0 THEN 'IN' ELSE 'OUT' END,
        p_source,
        NULL
    );
    RETURN v_result;
END;
$$;
