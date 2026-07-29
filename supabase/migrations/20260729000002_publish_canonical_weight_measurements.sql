-- Publish only Peter's Withings weight series from Pumpernickel's canonical
-- health store. The underlying mediator tables remain private and are never
-- granted to browser roles.
create or replace function public.get_published_weight_measurements()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'withings_timestamp', measurements.measured_at,
        'weight_kg', measurements.value_numeric
      )
      order by measurements.measured_at
    ),
    '[]'::jsonb
  )
  from mediator.health_normalized_measurements as measurements
  inner join mediator.health_connections as connections
    on connections.id = measurements.connection_id
  where measurements.user_id = 'faed044b-eca4-47d5-a21e-c9ca85624d39'::uuid
    and measurements.metric = 'weight'
    and measurements.canonical_unit = 'kg'
    and connections.provider = 'withings';
$$;

comment on function public.get_published_weight_measurements() is
  'Public website projection of Peter O''Malley''s Withings timestamps and weights. Backend service-role access only.';

revoke all on function public.get_published_weight_measurements() from public;
revoke all on function public.get_published_weight_measurements() from anon, authenticated;
grant execute on function public.get_published_weight_measurements() to service_role;
