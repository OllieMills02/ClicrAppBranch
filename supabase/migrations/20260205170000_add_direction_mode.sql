
-- 20260205170000_add_direction_mode.sql
ALTER TABLE devices ADD COLUMN IF NOT EXISTS direction_mode text DEFAULT 'bidirectional';
