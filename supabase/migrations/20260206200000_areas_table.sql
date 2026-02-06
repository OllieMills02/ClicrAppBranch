-- Areas: zones within a venue (e.g. Main Floor, VIP, Patio).
-- Access: anyone who is part of that venue (org member or venue staff) can read and manage areas.
CREATE TABLE IF NOT EXISTS public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer DEFAULT 0,
  area_type text DEFAULT 'MAIN',
  counting_mode text DEFAULT 'BOTH',
  is_active boolean DEFAULT true,
  current_occupancy integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Select areas for venues the user is part of (org member or venue_staff)
CREATE POLICY "Areas: select by venue access"
ON public.areas
FOR SELECT
TO authenticated
USING (
  venue_id IN (
    SELECT id FROM public.venues
    WHERE org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid() AND org_id IS NOT NULL
    )
    OR id IN (SELECT venue_id FROM public.venue_staff WHERE user_id = auth.uid())
  )
);

-- Insert/update/delete areas for venues the user is part of (same as select)
CREATE POLICY "Areas: manage by venue member"
ON public.areas
FOR ALL
TO authenticated
USING (
  venue_id IN (
    SELECT id FROM public.venues
    WHERE org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid() AND org_id IS NOT NULL
    )
    OR id IN (SELECT venue_id FROM public.venue_staff WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  venue_id IN (
    SELECT id FROM public.venues
    WHERE org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid() AND org_id IS NOT NULL
    )
    OR id IN (SELECT venue_id FROM public.venue_staff WHERE user_id = auth.uid())
  )
);

COMMENT ON TABLE public.areas IS 'Monitoring zones within a venue. Accessible to anyone who is part of that venue (org or staff).';
