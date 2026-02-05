-- 20260205130000_fix_totals_reset_logic.sql

-- 1. UPDATE reset_counts to update timestamps
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
    v_reset_time timestamptz := now();
BEGIN
    -- 1. Security
    IF NOT is_business_member(p_business_id) THEN
         RAISE EXCEPTION 'Access Denied';
    END IF;

    -- 2. Audit Log
    INSERT INTO audit_logs (business_id, actor_user_id, action, entity_type, before_json)
    VALUES (p_business_id, auth.uid(), 'RESET_COUNTS', p_scope, jsonb_build_object('venue', p_venue_id, 'area', p_area_id, 'reason', p_reason));

    -- 3. Update Last Reset Timestamps (The Logic Fix)
    IF p_scope = 'AREA' AND p_area_id IS NOT NULL THEN
        UPDATE areas SET last_reset_at = v_reset_time WHERE id = p_area_id AND business_id = p_business_id;
    ELSIF p_scope = 'VENUE' AND p_venue_id IS NOT NULL THEN
        UPDATE venues SET last_reset_at = v_reset_time WHERE id = p_venue_id AND business_id = p_business_id;
        -- Also update all child areas? Ideally yes, to keep areas in sync with venue reset.
        UPDATE areas SET last_reset_at = v_reset_time WHERE venue_id = p_venue_id AND business_id = p_business_id;
    ELSIF p_scope = 'BUSINESS' THEN
        -- Update ALL venues and areas
        UPDATE venues SET last_reset_at = v_reset_time WHERE business_id = p_business_id;
        UPDATE areas SET last_reset_at = v_reset_time WHERE business_id = p_business_id;
    END IF;


    -- 4. Reset Snapshots (Zero out current occupancy)
    -- We perform a bulk update on snapshots. 
    -- We do NOT insert negative events anymore for balancing, 
    -- because 'get_traffic_totals' will now use 'last_reset_at' to ignore old history.
    -- However, we SHOULD insert an audit event for the timeline if needed, but 'audit_logs' covers it.
    -- To be safe for 'occupancy_events' timeline visualization, we insert a marker.
    
    INSERT INTO occupancy_events (business_id, venue_id, area_id, delta, source, flow_type, event_type)
    SELECT business_id, venue_id, area_id, -current_occupancy, 'RESET', 'OUT', 'RESET'
    FROM occupancy_snapshots
    WHERE business_id = p_business_id
      AND (p_scope = 'BUSINESS' OR (p_scope = 'VENUE' AND venue_id = p_venue_id) OR (p_scope = 'AREA' AND area_id = p_area_id))
      AND current_occupancy > 0;

    -- Now actually zero them
    WITH updated_rows AS (
        UPDATE occupancy_snapshots
        SET current_occupancy = 0, updated_at = v_reset_time
        WHERE business_id = p_business_id
          AND (p_scope = 'BUSINESS' OR (p_scope = 'VENUE' AND venue_id = p_venue_id) OR (p_scope = 'AREA' AND area_id = p_area_id))
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_affected FROM updated_rows;

    RETURN QUERY SELECT v_affected, 0::bigint, v_reset_time;
END;
$$;


-- 2. UPDATE get_traffic_totals to use last_reset_at
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
DECLARE
    v_reset_filter timestamptz;
BEGIN
    IF NOT is_business_member(p_business_id) THEN
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint;
        RETURN;
    END IF;

    -- Determine the effective start time based on Last Reset
    -- Logic: If we are scoped to Area, use Area's reset. 
    -- If Venue, use Venue's reset.
    -- If Business, we can't easily pick one reset, so we default to p_start_ts or min(venue resets)?
    -- Let's stick to strict scoping:
    
    v_reset_filter := '-infinity'::timestamptz;

    IF p_area_id IS NOT NULL THEN
        SELECT last_reset_at INTO v_reset_filter FROM areas WHERE id = p_area_id;
    ELSIF p_venue_id IS NOT NULL THEN
        SELECT last_reset_at INTO v_reset_filter FROM venues WHERE id = p_venue_id;
    END IF;

    -- If null (no reset ever), treat as infinity past
    IF v_reset_filter IS NULL THEN
        v_reset_filter := '-infinity'::timestamptz;
    END IF;

    -- Effective Start is MAX(Requested Start, Last Reset)
    -- This ensures we only see traffic since the last reset within the requested window via UI
    -- But usually UI sends Top of Day. Reset might be mid-day. 
    -- So we want GREATEST.
    
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
    AND oe.created_at >= GREATEST(p_start_ts, v_reset_filter) -- THE FIX
    AND oe.created_at <= p_end_ts
    AND oe.event_type != 'RESET'; -- Ignore the reset event itself so we start at 0 clean
END;
$$;
