-- Fix Devices RLS Policies
-- Enables RLS and sets up policies for View and Management

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- 1. View Policy: Users can view devices belonging to their business
CREATE POLICY "View own business devices" ON devices
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- 2. Insert Policy: Owners and Managers can add devices
-- Note: 'profiles' table stores the role. 
-- Adjust this if 'business_members' table is the source of truth for some setups, 
-- but schema.sql defines business_id directly on profiles for single-tenant simplicty.
CREATE POLICY "Manage own business devices" ON devices
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- 3. Update Policy
CREATE POLICY "Update own business devices" ON devices
  FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- 4. Delete Policy
CREATE POLICY "Delete own business devices" ON devices
  FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
    )
  );
