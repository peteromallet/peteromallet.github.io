import type { PostPageData, PostSummary } from '../types';

async function clientFetch<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Posts API request failed (${response.status})`);
  return response.json();
}

export async function getClientPosts(): Promise<PostSummary[] | null> {
  return clientFetch<PostSummary[]>('/api/posts');
}

export async function getClientPostPage(slug: string): Promise<PostPageData | null> {
  return clientFetch<PostPageData>(`/api/posts/${encodeURIComponent(slug)}`);
}
