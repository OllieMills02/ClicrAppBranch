-- RPC: get_traffic_totals
-- Calculates aggregate traffic stats for a given scope and time window
-- Usage: SELECT * FROM get_traffic_totals('biz_123', NULL, NULL, '2023-01-01', '2023-01-02');

CREATE OR REPLACE FUNCTION get_traffic_totals(
  p_business_id uuid,
  p_venue_id uuid DEFAULT NULL,
  p_area_id uuid DEFAULT NULL,
  p_start_ts timestamptz DEFAULT now() - interval '1 day',
  p_end_ts timestamptz DEFAULT now()
)
RETURNS TABLE (
  total_in bigint,
  total_out bigint,
  net_delta bigint,
  event_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges to bypass RLS for aggregation (controlled by logic below)
AS $$
BEGIN
  -- We rely on the calling application/API to verify permissions, or we could add strict RLS checks here.
  -- Since this is SECURITY DEFINER, we trust the p_business_id argument matches the user context (or is from admin API).
  
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0) as total_in,
    COALESCE(SUM(CASE WHEN delta < 0 THEN ABS(delta) ELSE 0 END), 0) as total_out,
    COALESCE(SUM(delta), 0) as net_delta,
    COUNT(*) as event_count
  FROM occupancy_events
  WHERE business_id = p_business_id
    AND (p_venue_id IS NULL OR venue_id = p_venue_id)
    AND (p_area_id IS NULL OR area_id = p_area_id)
    AND timestamp >= p_start_ts
    AND timestamp <= p_end_ts;
END;
$$;
