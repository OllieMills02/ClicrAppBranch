-- Devices (clickers): many-to-one with areas. Log occupancy via current_count.
-- Access: same as areas (via venue membership).
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  name text NOT NULL,
  flow_mode text DEFAULT 'BIDIRECTIONAL' CHECK (flow_mode IN ('BIDIRECTIONAL', 'IN_ONLY', 'OUT_ONLY')),
  current_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS devices_area_id_idx ON public.devices(area_id);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Select devices for areas in venues the user is part of
CREATE POLICY "Devices: select by area venue access"
ON public.devices
FOR SELECT
TO authenticated
USING (
  area_id IN (
    SELECT a.id FROM public.areas a
    INNER JOIN public.venues v ON v.id = a.venue_id
    WHERE v.org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid() AND org_id IS NOT NULL
    )
    OR v.id IN (SELECT venue_id FROM public.venue_staff WHERE user_id = auth.uid())
  )
);

-- Insert/update/delete devices for areas in venues the user is part of
CREATE POLICY "Devices: manage by area venue member"
ON public.devices
FOR ALL
TO authenticated
USING (
  area_id IN (
    SELECT a.id FROM public.areas a
    INNER JOIN public.venues v ON v.id = a.venue_id
    WHERE v.org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid() AND org_id IS NOT NULL
    )
    OR v.id IN (SELECT venue_id FROM public.venue_staff WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  area_id IN (
    SELECT a.id FROM public.areas a
    INNER JOIN public.venues v ON v.id = a.venue_id
    WHERE v.org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid() AND org_id IS NOT NULL
    )
    OR v.id IN (SELECT venue_id FROM public.venue_staff WHERE user_id = auth.uid())
  )
);

-- Optional: sync area.current_occupancy from sum of devices in that area
CREATE OR REPLACE FUNCTION public.sync_area_occupancy_from_devices()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.areas
  SET current_occupancy = COALESCE((
    SELECT SUM(d.current_count)::integer FROM public.devices d WHERE d.area_id = COALESCE(NEW.area_id, OLD.area_id) AND d.is_active = true
  ), 0),
  updated_at = now()
  WHERE id = COALESCE(NEW.area_id, OLD.area_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_devices_sync_area_occupancy ON public.devices;
CREATE TRIGGER tr_devices_sync_area_occupancy
  AFTER INSERT OR UPDATE OF current_count OR DELETE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_area_occupancy_from_devices();

COMMENT ON TABLE public.devices IS 'Clickers/devices per area (many-to-one). current_count logs occupancy; area.current_occupancy is synced from sum of device counts.';
