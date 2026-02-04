-- 18_fix_venues_policy.sql

-- Enable RLS (just in case)
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Allow Business Owners/Managers to insert venues
CREATE POLICY "Allow members to insert venues" ON venues
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = venues.business_id
    AND user_id = auth.uid()
    AND role IN ('OWNER', 'MANAGER', 'STAFF') -- Staff? Maybe restrict to Owner/Manager
  )
);

-- Allow Members to Update venues
CREATE POLICY "Allow members to update venues" ON venues
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = venues.business_id
    AND user_id = auth.uid()
    AND role IN ('OWNER', 'MANAGER')
  )
);

-- Allow Members to Select venues
CREATE POLICY "Allow members to select venues" ON venues
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = venues.business_id
    AND user_id = auth.uid()
  )
);

-- Fix Areas policies too just in case
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members to insert areas" ON areas
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM venues
    JOIN business_members ON business_members.business_id = venues.business_id
    WHERE venues.id = areas.venue_id
    AND business_members.user_id = auth.uid()
    AND business_members.role IN ('OWNER', 'MANAGER')
  )
);
