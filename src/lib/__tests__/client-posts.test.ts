import {
  describe,
  it,
  expect,
  afterEach,
  vi
} from 'vitest';
import { getClientPosts, getClientPostPage } from '../client-posts';

const POST_ROW_1 = {
  slug: 'hello-world',
  title: 'Hello World',
  date: '2024-01-15',
  excerpt: 'A short excerpt.',
  formattedDate: 'January 15, 2024',
};

const POST_ROW_2 = {
  slug: 'second-post',
  title: 'Second Post',
  date: '2024-01-10',
  excerpt: 'Another excerpt.',
  formattedDate: 'January 10, 2024',
};

// ---------------------------------------------------------------------------
// getClientPosts
// ---------------------------------------------------------------------------

describe('getClientPosts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches posts from the server API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [POST_ROW_1, POST_ROW_2],
      }),
    );

    const posts = await getClientPosts();
    expect(posts).not.toBeNull();
    expect(posts!.length).toBe(2);
    expect(posts![0].slug).toBe('hello-world');
    expect(posts![0].title).toBe('Hello World');
    expect(posts![0].excerpt).toBe('A short excerpt.');
    expect(posts![0].date).toBe('2024-01-15');
    expect(posts![0].formattedDate).toBe('January 15, 2024');
  });

  it('calls fetch with the posts API URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', mockFetch);

    await getClientPosts();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/posts');
    expect(options.headers.Accept).toBe('application/json');
  });

  it('throws when the server response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    await expect(getClientPosts()).rejects.toThrow('500');
  });
});

// ---------------------------------------------------------------------------
// getClientPostPage
// ---------------------------------------------------------------------------

describe('getClientPostPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when the server does not find the post', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );

    await expect(getClientPostPage('nonexistent')).rejects.toThrow('404');
  });

  it('returns post detail and navigation from the server API', async () => {
    const postPage = {
      post: { ...POST_ROW_1, html: '<h1>Hello World</h1><p>Body text.</p>' },
      prevPost: null,
      nextPost: POST_ROW_2,
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => postPage }),
    );

    const result = await getClientPostPage('hello-world');
    expect(result).not.toBeNull();
    expect(result!.post).not.toBeNull();
    expect(result!.post!.slug).toBe('hello-world');
    expect(result!.post!.title).toBe('Hello World');
    expect(result!.post!.html).toContain('Body text.');
    expect(result!.nextPost!.slug).toBe('second-post');
  });

  it('encodes the slug in the post API URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ post: null, prevPost: null, nextPost: null }),
    });

    vi.stubGlobal('fetch', mockFetch);

    await getClientPostPage('hello world');
    expect(mockFetch.mock.calls[0][0]).toBe('/api/posts/hello%20world');
  });
});
