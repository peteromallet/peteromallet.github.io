import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeightsChart } from '../WeightsChart';

describe('WeightsChart', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads weights through the website API without exposing Supabase credentials', async () => {
    const mockFetch = vi.fn(() => new Promise(() => undefined));
    vi.stubGlobal('fetch', mockFetch);

    const { unmount } = render(<WeightsChart />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/weights',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    unmount();
  });
});
