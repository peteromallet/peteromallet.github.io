import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(
    process.cwd(),
    'supabase/migrations/20260729000002_publish_canonical_weight_measurements.sql',
  ),
  'utf8',
).toLowerCase();
const cleanupMigration = fs.readFileSync(
  path.resolve(
    process.cwd(),
    'supabase/migrations/20260729000003_retire_legacy_measurements_read.sql',
  ),
  'utf8',
).toLowerCase();

describe('published weights migration', () => {
  it('keeps the canonical health table private behind a fixed-user projection', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      "measurements.user_id = 'faed044b-eca4-47d5-a21e-c9ca85624d39'::uuid",
    );
    expect(migration).toContain("measurements.metric = 'weight'");
    expect(migration).toContain("connections.provider = 'withings'");
    expect(migration).toContain("'withings_timestamp', measurements.measured_at");
    expect(migration).toContain("'weight_kg', measurements.value_numeric");
  });

  it('allows only the service role to execute the projection', () => {
    expect(migration).toContain(
      'revoke all on function public.get_published_weight_measurements() from public',
    );
    expect(migration).toContain(
      'revoke all on function public.get_published_weight_measurements() from anon, authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.get_published_weight_measurements() to service_role',
    );
  });

  it('retires anonymous access to the stale legacy table', () => {
    expect(cleanupMigration).toContain(
      'revoke select on table public.measurements from anon, authenticated',
    );
    expect(cleanupMigration).toContain(
      'drop policy if exists "public read measurements" on public.measurements',
    );
  });
});
