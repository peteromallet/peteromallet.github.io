import { supabaseServiceRequest } from './supabase';

export interface PublishedWeightMeasurement {
  withings_timestamp: string;
  weight_kg: number | string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedMeasurements:
  | { data: PublishedWeightMeasurement[]; expiresAt: number }
  | undefined;
let pendingRequest: Promise<PublishedWeightMeasurement[]> | undefined;

export function clearPublishedWeightMeasurementsCache() {
  cachedMeasurements = undefined;
  pendingRequest = undefined;
}

export async function getPublishedWeightMeasurements() {
  const now = Date.now();
  if (cachedMeasurements && cachedMeasurements.expiresAt > now) {
    return cachedMeasurements.data;
  }

  if (pendingRequest) return pendingRequest;

  pendingRequest = supabaseServiceRequest<PublishedWeightMeasurement[]>(
    'rpc/get_published_weight_measurements',
    {
      method: 'POST',
      body: '{}',
    },
  )
    .then((measurements) => {
      if (!Array.isArray(measurements)) {
        throw new Error('Published weight RPC returned an invalid payload.');
      }

      cachedMeasurements = {
        data: measurements,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return measurements;
    })
    .finally(() => {
      pendingRequest = undefined;
    });

  return pendingRequest;
}
