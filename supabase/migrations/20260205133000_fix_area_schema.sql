-- 20260205133000_fix_area_schema.sql

-- Ensure areas has business_id and it is populated
DO $$ 
BEGIN
    -- 1. Add column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'areas' AND column_name = 'business_id') THEN
        ALTER TABLE areas ADD COLUMN business_id uuid;
    END IF;

    -- 2. Backfill business_id from venues
    UPDATE areas a
    SET business_id = v.business_id
    FROM venues v
    WHERE a.venue_id = v.id
    AND a.business_id IS NULL;

    -- 3. Add Not Null constraint if possible (after backfill)
    -- ALTER TABLE areas ALTER COLUMN business_id SET NOT NULL; -- risky if orphans exist
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Drop RLS on areas and re-apply to ensure it uses business_id
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read areas" ON areas;
DROP POLICY IF EXISTS "Manage areas" ON areas;

CREATE POLICY "Read areas" ON areas FOR SELECT USING (is_business_member(business_id));
CREATE POLICY "Manage areas" ON areas FOR ALL USING (is_business_member(business_id));
