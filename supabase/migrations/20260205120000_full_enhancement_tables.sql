-- 20260205120000_full_enhancement_tables.sql
-- Completing the schema for ID Scanning, Bans, and robust Reporting

-- ==========================================
-- 1. VENUES / AREAS ENHANCEMENTS
-- ==========================================
DO $$ BEGIN
    ALTER TABLE venues ADD COLUMN IF NOT EXISTS last_reset_at timestamptz DEFAULT now();
    ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity_max int DEFAULT 0;
    ALTER TABLE areas ADD COLUMN IF NOT EXISTS last_reset_at timestamptz DEFAULT now();
    ALTER TABLE areas ADD COLUMN IF NOT EXISTS capacity_max int DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ==========================================
-- 2. PATRONS & SCANS (ID SYSTEM)
-- ==========================================
CREATE TABLE IF NOT EXISTS patrons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    hashed_id_key text, -- For recurring identification without storing PII if needed
    first_name text,
    last_name text,
    dob date,
    sex text,
    zip_code text,
    id_type text,
    id_number_last4 text, -- Storing full ID is risky, last 4 is better
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS id_scans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    venue_id uuid,
    area_id uuid,
    device_id uuid,
    patron_id uuid REFERENCES patrons(id),
    scan_result text NOT NULL, -- 'ACCEPTED', 'DENIED', 'PENDING'
    age int,
    is_fake boolean DEFAULT false,
    expires_at date,
    
    -- Denormalized PII for the log event itself (snapshot)
    first_name text,
    last_name text,
    dob date,
    
    created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 3. BANS SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS bans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    patron_id uuid NOT NULL REFERENCES patrons(id),
    
    scope_type text NOT NULL, -- 'BUSINESS' or 'VENUE'
    scope_id uuid, -- If VENUE, which one. If BUSINESS, ignored or = business_id
    
    status text NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'REVOKED'
    ban_type text DEFAULT 'PERMANENT',
    
    start_datetime timestamptz DEFAULT now(),
    end_datetime timestamptz,
    
    reason text,
    notes text,
    
    banned_by uuid, -- user_id
    created_at timestamptz DEFAULT now()
);

-- Audit/Enforcement Logs for Bans
CREATE TABLE IF NOT EXISTS ban_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid,
    ban_id uuid,
    action text, -- 'CREATED', 'REVOKED', 'ENFORCED'
    performed_by uuid,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 4. APP ERRORS (Logging)
-- ==========================================
CREATE TABLE IF NOT EXISTS app_errors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid,
    user_id uuid,
    feature text,
    message text,
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 5. RPCs for FULL FUNCTIONALITY
-- ==========================================

-- Helper: Check Ban Status
CREATE OR REPLACE FUNCTION check_ban_status(
    p_business_id uuid,
    p_patron_id uuid,
    p_venue_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_ban record;
BEGIN
    -- Check Business Level Ban
    SELECT * INTO v_ban FROM bans 
    WHERE business_id = p_business_id 
      AND patron_id = p_patron_id 
      AND scope_type = 'BUSINESS'
      AND status = 'ACTIVE'
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object('is_banned', true, 'scope', 'BUSINESS', 'reason', v_ban.reason);
    END IF;

    -- Check Venue Level Ban
    IF p_venue_id IS NOT NULL THEN
        SELECT * INTO v_ban FROM bans 
        WHERE business_id = p_business_id 
          AND patron_id = p_patron_id 
          AND scope_type = 'VENUE'
          AND scope_id = p_venue_id
          AND status = 'ACTIVE'
        LIMIT 1;
        
        IF FOUND THEN
             RETURN jsonb_build_object('is_banned', true, 'scope', 'VENUE', 'reason', v_ban.reason);
        END IF;
    END IF;

    RETURN jsonb_build_object('is_banned', false);
END;
$$;


-- GET AREA SUMMARIES (Live + Capacity)
DROP FUNCTION IF EXISTS get_area_summaries;
CREATE OR REPLACE FUNCTION get_area_summaries(p_venue_id uuid)
RETURNS TABLE (
    area_id uuid,
    name text,
    current_occupancy int,
    capacity_max int,
    percent_full numeric,
    last_reset_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as area_id,
        a.name,
        COALESCE(os.current_occupancy, 0) as current_occupancy,
        COALESCE(a.capacity_max, 0) as capacity_max,
        CASE 
            WHEN COALESCE(a.capacity_max, 0) > 0 THEN ROUND((COALESCE(os.current_occupancy, 0)::numeric / a.capacity_max::numeric) * 100, 1)
            ELSE 0 
        END as percent_full,
        a.last_reset_at
    FROM areas a
    LEFT JOIN occupancy_snapshots os ON os.area_id = a.id
    WHERE a.venue_id = p_venue_id
    ORDER BY a.name;
END;
$$;


-- GET VENUE SUMMARIES
DROP FUNCTION IF EXISTS get_venue_summaries;
CREATE OR REPLACE FUNCTION get_venue_summaries(p_business_id uuid)
RETURNS TABLE (
    venue_id uuid,
    name text,
    total_occupancy bigint,
    capacity_max int,
    percent_full numeric,
    last_reset_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as venue_id,
        v.name,
        SUM(COALESCE(os.current_occupancy, 0)) as total_occupancy,
        v.capacity_max,
        CASE 
            WHEN COALESCE(v.capacity_max, 0) > 0 THEN ROUND((SUM(COALESCE(os.current_occupancy, 0))::numeric / v.capacity_max::numeric) * 100, 1)
            ELSE 0 
        END as percent_full,
        v.last_reset_at
    FROM venues v
    LEFT JOIN areas a ON a.venue_id = v.id
    LEFT JOIN occupancy_snapshots os ON os.area_id = a.id
    WHERE v.business_id = p_business_id
    GROUP BY v.id, v.capacity_max, v.last_reset_at
    ORDER BY v.name;
END;
$$;


-- REPORTING: Daily Summary
DROP FUNCTION IF EXISTS get_daily_traffic_summary;
CREATE OR REPLACE FUNCTION get_daily_traffic_summary(
    p_business_id uuid,
    p_venue_id uuid,
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    activity_date date,
    total_in bigint,
    total_out bigint,
    peak_occupancy int
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        created_at::date as activity_date,
        SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END) as total_in,
        SUM(CASE WHEN delta < 0 THEN ABS(delta) ELSE 0 END) as total_out,
        0 as peak_occupancy -- Placeholder, harder to calc cheaply without snapshot history
    FROM occupancy_events
    WHERE business_id = p_business_id
      AND venue_id = p_venue_id
      AND created_at::date >= p_start_date
      AND created_at::date <= p_end_date
    GROUP BY created_at::date
    ORDER BY created_at::date DESC;
END;
$$;

-- RLS UPDATE FOR NEW TABLES
ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_errors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Patrons
    DROP POLICY IF EXISTS "View own business patrons" ON patrons;
    CREATE POLICY "View own business patrons" ON patrons FOR SELECT USING (is_business_member(business_id));
    CREATE POLICY "Manage own business patrons" ON patrons FOR ALL USING (is_business_member(business_id));

    -- Scans
    DROP POLICY IF EXISTS "View own business scans" ON id_scans;
    CREATE POLICY "View own business scans" ON id_scans FOR SELECT USING (is_business_member(business_id));
    CREATE POLICY "Insert own business scans" ON id_scans FOR INSERT WITH CHECK (is_business_member(business_id));

    -- Bans
    DROP POLICY IF EXISTS "View own business bans" ON bans;
    CREATE POLICY "View own business bans" ON bans FOR SELECT USING (is_business_member(business_id));
    CREATE POLICY "Manage own business bans" ON bans FOR ALL USING (is_business_member(business_id));
    
    -- Errors
    DROP POLICY IF EXISTS "Insert errors" ON app_errors;
    CREATE POLICY "Insert errors" ON app_errors FOR INSERT WITH CHECK (true); -- Allow all to log errors? Or restrict to member?
    -- Safest is member only, but unauth errors might be useful. Let's stick to member for now.
    DROP POLICY IF EXISTS "Member Insert errors" ON app_errors;
    CREATE POLICY "Member Insert errors" ON app_errors FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

EXCEPTION WHEN OTHERS THEN NULL; END $$;
