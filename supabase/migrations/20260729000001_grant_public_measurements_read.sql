-- RLS policies filter rows after Postgres checks table privileges. The public
-- measurements policy therefore also needs an explicit SELECT grant.
grant select on table public.measurements to anon, authenticated;
