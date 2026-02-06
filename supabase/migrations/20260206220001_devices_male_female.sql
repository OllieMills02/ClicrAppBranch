-- Add male/female breakdown for simple counter UI (optional; defaults 0)
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS count_male integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS count_female integer DEFAULT 0;

COMMENT ON COLUMN public.devices.count_male IS 'Count of males in area from this device.';
COMMENT ON COLUMN public.devices.count_female IS 'Count of females in area from this device.';
