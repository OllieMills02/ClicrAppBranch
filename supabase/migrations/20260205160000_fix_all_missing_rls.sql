
-- 20260205160000_fix_all_missing_rls.sql
-- CRITICAL FIX: Add missing RLS policies for Metadata Tables
-- Previously, only atomic data tables (events/snapshots) had RLS. Metadata (venues/areas) was blocked.

-- ==============================================================================
-- 1. BUSINESSES
-- ==============================================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read business" ON businesses;
CREATE POLICY "Read business" ON businesses FOR SELECT
USING (
  id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow creating a business (Onboarding) - usually this is done by service role, 
-- but if we want user client to do it, we need an INSERT policy.
-- The onboarding action currently uses supabaseAdmin (service role), so we don't strictly need INSERT policy for users.
-- We'll leave INSERT blocked for users to force use of the RPC or Admin action for safety.

-- Update settings?
DROP POLICY IF EXISTS "Update business settings" ON businesses;
CREATE POLICY "Update business settings" ON businesses FOR UPDATE
USING (
  id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND role IN ('OWNER')
  )
);

-- ==============================================================================
-- 2. VENUES
-- ==============================================================================
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read venues" ON venues;
CREATE POLICY "Read venues" ON venues FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Insert venues" ON venues;
CREATE POLICY "Insert venues" ON venues FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND role IN ('OWNER', 'MANAGER')
  )
);

DROP POLICY IF EXISTS "Update venues" ON venues;
CREATE POLICY "Update venues" ON venues FOR UPDATE
USING (
  business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND role IN ('OWNER', 'MANAGER')
  )
);

DROP POLICY IF EXISTS "Delete venues" ON venues;
CREATE POLICY "Delete venues" ON venues FOR DELETE
USING (
  business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND role IN ('OWNER')
  )
);

-- ==============================================================================
-- 3. AREAS
-- ==============================================================================
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read areas" ON areas;
CREATE POLICY "Read areas" ON areas FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Insert areas" ON areas;
CREATE POLICY "Insert areas" ON areas FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND role IN ('OWNER', 'MANAGER')
  )
);

DROP POLICY IF EXISTS "Update areas" ON areas;
CREATE POLICY "Update areas" ON areas FOR UPDATE
USING (
  business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND role IN ('OWNER', 'MANAGER')
  )
);

DROP POLICY IF EXISTS "Delete areas" ON areas;
CREATE POLICY "Delete areas" ON areas FOR DELETE
USING (
  business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND role IN ('OWNER')
  )
);

-- ==============================================================================
-- 4. VERIFY Business Members (Just in case)
-- ==============================================================================
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read business_members" ON business_members;
CREATE POLICY "Read business_members" ON business_members FOR SELECT USING (user_id = auth.uid());

