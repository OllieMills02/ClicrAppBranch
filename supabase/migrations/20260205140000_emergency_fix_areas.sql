-- 20260205140000_emergency_fix_areas.sql
DO $$ 
BEGIN
    -- 1. Add column if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'areas' AND column_name = 'business_id') THEN
        ALTER TABLE areas ADD COLUMN business_id uuid;
    END IF;
    
    -- 2. Add column 'capacity_max' if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'areas' AND column_name = 'capacity_max') THEN
        ALTER TABLE areas ADD COLUMN capacity_max int DEFAULT 0;
    END IF;

    -- 3. Add column 'last_reset_at' if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'areas' AND column_name = 'last_reset_at') THEN
        ALTER TABLE areas ADD COLUMN last_reset_at timestamptz DEFAULT now();
    END IF;

    -- 4. Backfill business_id from venues
    UPDATE areas a
    SET business_id = v.business_id
    FROM venues v
    WHERE a.venue_id = v.id
    AND a.business_id IS NULL;

    -- 5. Force Schema Cache Reload
    NOTIFY pgrst, 'reload config';
END $$;
