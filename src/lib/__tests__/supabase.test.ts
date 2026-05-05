import {
  describe,
  it,
  expect,
  afterEach,
  vi
} from 'vitest';
import {
  getPublicSupabaseConfig,
  getServiceRoleKey,
  hasPublicSupabaseConfig,
  supabaseServiceRequest,
} from '../supabase';

describe('getPublicSupabaseConfig', () => {
  const originalUrl = process.env.VITE_SUPABASE_URL;
  const originalKey = process.env.VITE_SUPABASE_ANON_KEY;

  afterEach(() => {
    // Restore env vars after each test
    if (originalUrl === undefined) {
      delete process.env.VITE_SUPABASE_URL;
    } else {
      process.env.VITE_SUPABASE_URL = originalUrl;
    }
    if (originalKey === undefined) {
      delete process.env.VITE_SUPABASE_ANON_KEY;
    } else {
      process.env.VITE_SUPABASE_ANON_KEY = originalKey;
    }
  });

  it('returns config object with supabaseUrl and supabaseAnonKey', () => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

    const config = getPublicSupabaseConfig();
    expect(config).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'test-anon-key',
    });
  });

  it('returns empty strings when env vars are not set', () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;

    const config = getPublicSupabaseConfig();
    expect(config.supabaseUrl).toBe('');
    expect(config.supabaseAnonKey).toBe('');
  });

  it('returns an object with the expected shape', () => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'key123';

    const config = getPublicSupabaseConfig();
    expect(config).toHaveProperty('supabaseUrl');
    expect(config).toHaveProperty('supabaseAnonKey');
  });
});

describe('hasPublicSupabaseConfig', () => {
  afterEach(() => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  });

  it('returns true when both env vars are set', () => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

    expect(hasPublicSupabaseConfig()).toBe(true);
  });

  it('returns false when URL is missing', () => {
    delete process.env.VITE_SUPABASE_URL;
    process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

    expect(hasPublicSupabaseConfig()).toBe(false);
  });

  it('returns false when anon key is missing', () => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.VITE_SUPABASE_ANON_KEY;

    expect(hasPublicSupabaseConfig()).toBe(false);
  });

  it('returns false when both env vars are missing', () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;

    expect(hasPublicSupabaseConfig()).toBe(false);
  });

  it('returns false when URL is empty string', () => {
    process.env.VITE_SUPABASE_URL = '';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

    expect(hasPublicSupabaseConfig()).toBe(false);
  });
});

describe('getServiceRoleKey', () => {
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    if (originalServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    }
  });

  it('returns the service role key from the environment', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    expect(getServiceRoleKey()).toBe('service-role-key');
  });
});

describe('supabaseServiceRequest', () => {
  const originalUrl = process.env.VITE_SUPABASE_URL;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalUrl === undefined) {
      delete process.env.VITE_SUPABASE_URL;
    } else {
      process.env.VITE_SUPABASE_URL = originalUrl;
    }

    if (originalServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    }
  });

  it('uses the service role key for apikey and Authorization headers', async () => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[]',
    });
    vi.stubGlobal('fetch', mockFetch);

    await supabaseServiceRequest('feedback?select=id');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/rest/v1/feedback?select=id');
    expect(options.headers.apikey).toBe('service-role-key');
    expect(options.headers.Authorization).toBe('Bearer service-role-key');
  });
});
