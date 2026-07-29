create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  date date not null,
  draft boolean default false,
  markdown text not null,
  excerpt text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table posts enable row level security;

create policy "Public read published posts"
  on posts
  for select
  using (draft = false);

alter table measurements enable row level security;

revoke select on table measurements from anon, authenticated;

drop policy if exists "Public read measurements" on measurements;

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
