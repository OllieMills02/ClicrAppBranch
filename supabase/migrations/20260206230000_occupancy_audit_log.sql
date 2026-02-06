-- Use existing occupancy_logs for audit. Add area_id and device_id so we can log
-- which device updated which area. All area occupancy changes go through the RPC
-- so every update is logged with device_id.

-- Add columns to existing table (nullable for backward compatibility)
ALTER TABLE public.occupancy_logs
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.areas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL;

-- Prevent venue triggers on occupancy_logs from double-counting when we already
-- update venue from area rollup (rows with area_id set are audit-only for venue).
CREATE OR REPLACE FUNCTION public.handle_entry_and_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.area_id IS NOT NULL THEN RETURN NEW; END IF;
  UPDATE public.venues SET current_occupancy = current_occupancy + NEW.delta WHERE id = NEW.venue_id;
  UPDATE public.venues SET current_occupancy = 0 WHERE id = NEW.venue_id AND current_occupancy < 0;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_occupancy_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.area_id IS NOT NULL THEN RETURN NEW; END IF;
  UPDATE public.venues SET current_occupancy = GREATEST(0, current_occupancy + NEW.delta) WHERE id = NEW.venue_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_occupancy_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.area_id IS NOT NULL THEN RETURN NEW; END IF;
  UPDATE public.venues SET current_occupancy = current_occupancy + NEW.delta WHERE id = NEW.venue_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_venue_occupancy()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.area_id IS NOT NULL THEN RETURN NEW; END IF;
  UPDATE public.venues SET current_occupancy = current_occupancy + NEW.delta WHERE id = NEW.venue_id;
  RETURN NEW;
END; $$;

-- Single RPC: update area counts and log each change to occupancy_logs with device_id.
-- Caller must have venue access (RLS on areas/occupancy_logs applies).
CREATE OR REPLACE FUNCTION public.update_area_occupancy(
  p_area_id uuid,
  p_device_id uuid,
  p_count_male integer,
  p_count_female integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_venue_id uuid;
  v_old_male integer;
  v_old_female integer;
  v_delta_male integer;
  v_delta_female integer;
BEGIN
  SELECT venue_id, COALESCE(count_male, 0), COALESCE(count_female, 0)
    INTO v_venue_id, v_old_male, v_old_female
  FROM public.areas
  WHERE id = p_area_id
  FOR UPDATE;

  IF v_venue_id IS NULL THEN
    RAISE EXCEPTION 'Area not found: %', p_area_id;
  END IF;

  v_delta_male := p_count_male - v_old_male;
  v_delta_female := p_count_female - v_old_female;

  UPDATE public.areas
  SET count_male = p_count_male,
      count_female = p_count_female,
      updated_at = now()
  WHERE id = p_area_id;

  IF v_delta_male <> 0 THEN
    INSERT INTO public.occupancy_logs (venue_id, area_id, device_id, delta, source, gender)
    VALUES (v_venue_id, p_area_id, p_device_id, v_delta_male, 'clicker', 'M');
  END IF;
  IF v_delta_female <> 0 THEN
    INSERT INTO public.occupancy_logs (venue_id, area_id, device_id, delta, source, gender)
    VALUES (v_venue_id, p_area_id, p_device_id, v_delta_female, 'clicker', 'F');
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_area_occupancy(uuid, uuid, integer, integer) IS
  'Updates area count_male/count_female and logs each delta to occupancy_logs with device_id for audit.';

GRANT EXECUTE ON FUNCTION public.update_area_occupancy(uuid, uuid, integer, integer) TO authenticated;

-- Remove duplicate audit table if it was created by an earlier version of this migration
DROP TABLE IF EXISTS public.occupancy_audit_log;
