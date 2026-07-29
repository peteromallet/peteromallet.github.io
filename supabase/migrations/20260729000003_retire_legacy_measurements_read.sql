-- The website now reads the canonical Pumpernickel-backed projection through
-- its server. Keep the stale legacy table unavailable to browser roles so it
-- cannot become an accidental public source again.
revoke select on table public.measurements from anon, authenticated;
drop policy if exists "Public read measurements" on public.measurements;
