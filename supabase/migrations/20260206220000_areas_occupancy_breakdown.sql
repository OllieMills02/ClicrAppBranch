-- Occupancy (total, male, female) lives on AREAS so all clickers in an area share the same counts.
-- Areas roll up to venue (venue.current_occupancy = sum of areas in that venue).

-- Add male/female breakdown to areas
ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS count_male integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS count_female integer DEFAULT 0;

-- Keep area.current_occupancy in sync with count_male + count_female
CREATE OR REPLACE FUNCTION public.sync_area_occupancy_from_breakdown()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.current_occupancy := COALESCE(NEW.count_male, 0) + COALESCE(NEW.count_female, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_areas_sync_occupancy_breakdown ON public.areas;
CREATE TRIGGER tr_areas_sync_occupancy_breakdown
  BEFORE INSERT OR UPDATE OF count_male, count_female ON public.areas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_area_occupancy_from_breakdown();

-- When an area's occupancy changes, update the venue's total
CREATE OR REPLACE FUNCTION public.sync_venue_occupancy_from_areas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue_id uuid;
BEGIN
  v_venue_id := COALESCE(NEW.venue_id, OLD.venue_id);
  UPDATE public.venues
  SET current_occupancy = COALESCE((
    SELECT SUM(a.current_occupancy)::integer FROM public.areas a WHERE a.venue_id = v_venue_id
  ), 0)
  WHERE id = v_venue_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_areas_sync_venue_occupancy ON public.areas;
CREATE TRIGGER tr_areas_sync_venue_occupancy
  AFTER INSERT OR UPDATE OF current_occupancy, count_male, count_female OR DELETE ON public.areas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_occupancy_from_areas();

-- Stop syncing area from devices; area is now the source of truth (clickers update the area)
DROP TRIGGER IF EXISTS tr_devices_sync_area_occupancy ON public.devices;

COMMENT ON COLUMN public.areas.count_male IS 'Male count for this area; shared by all clickers in the area.';
COMMENT ON COLUMN public.areas.count_female IS 'Female count for this area; shared by all clickers in the area.';
