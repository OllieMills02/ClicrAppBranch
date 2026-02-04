-- Create a robust function to calculate traffic totals from the event stream
-- This is the Source of Truth for "Traffic In" and "Traffic Out"

CREATE OR REPLACE FUNCTION get_traffic_totals(
    p_business_id uuid,
    p_venue_id uuid,
    p_area_id uuid, -- Optional, if NULL, sums up for venue
    p_start_time timestamptz,
    p_end_time timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_in int;
    v_total_out int;
    v_net_delta int;
BEGIN
    -- Calculate totals from occupancy_events
    -- We filter by the provided IDs and the time window.
    -- If p_area_id is NULL, we ignore it in the filter (getting venue total).
    
    SELECT 
        COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0),
        COALESCE(ABS(SUM(CASE WHEN delta < 0 THEN delta ELSE 0 END)), 0),
        COALESCE(SUM(delta), 0)
    INTO v_total_in, v_total_out, v_net_delta
    FROM occupancy_events
    WHERE business_id = p_business_id
    AND (p_venue_id IS NULL OR venue_id = p_venue_id)
    AND (p_area_id IS NULL OR area_id = p_area_id)
    AND timestamp >= p_start_time
    AND timestamp <= p_end_time;

    RETURN jsonb_build_object(
        'total_in', v_total_in,
        'total_out', v_total_out,
        'net_delta', v_net_delta,
        'start_time', p_start_time,
        'end_time', p_end_time
    );
END;
$$;
