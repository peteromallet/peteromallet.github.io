import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearPublishedWeightMeasurementsCache,
  getPublishedWeightMeasurements,
} from '../weights';

describe('getPublishedWeightMeasurements', () => {
  const originalUrl = process.env.VITE_SUPABASE_URL;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    clearPublishedWeightMeasurementsCache();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    if (originalUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = originalUrl;

    if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });

  it('calls the narrow RPC with the backend service role', async () => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const measurements = [
      { withings_timestamp: '2026-07-28T08:53:57+00:00', weight_kg: 82.4 },
    ];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(measurements),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(getPublishedWeightMeasurements()).resolves.toEqual(measurements);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/get_published_weight_measurements',
      expect.objectContaining({
        method: 'POST',
        body: '{}',
        headers: expect.objectContaining({
          apikey: 'service-role-key',
          Authorization: 'Bearer service-role-key',
        }),
      }),
    );
  });

  it('caches successful reads and coalesces concurrent requests', async () => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const measurements = [
      { withings_timestamp: '2026-07-28T08:53:57+00:00', weight_kg: 82.4 },
    ];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(measurements),
    });
    vi.stubGlobal('fetch', mockFetch);

    const [first, second] = await Promise.all([
      getPublishedWeightMeasurements(),
      getPublishedWeightMeasurements(),
    ]);
    const third = await getPublishedWeightMeasurements();

    expect(first).toEqual(measurements);
    expect(second).toEqual(measurements);
    expect(third).toEqual(measurements);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
