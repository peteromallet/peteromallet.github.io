import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PostSummary } from '../types';
import { Header } from '../components/Header';
import { getClientPosts } from '../lib/client-posts';

interface PostsPageProps {
  posts?: PostSummary[];
}

const COLOR_VARIANTS = [
  'color-1',
  'color-2',
  'color-3',
  'color-4',
  'color-5',
  'color-6',
  'color-7',
  'color-8',
];

let cachedPosts: PostSummary[] | null = null;

function PostsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className={`posts-card posts-card-skeleton ${COLOR_VARIANTS[index % COLOR_VARIANTS.length]}`}
          aria-hidden="true"
        >
          <div className="skeleton-line skeleton-title"></div>
          <div className="skeleton-line skeleton-date"></div>
          <div className="skeleton-line skeleton-excerpt"></div>
          <div className="skeleton-line skeleton-excerpt skeleton-excerpt-short"></div>
        </div>
      ))}
    </>
  );
}

export function PostsPage({ posts: initialPosts }: PostsPageProps) {
  const hasInitialPosts = initialPosts !== undefined;
  const hasCached = !hasInitialPosts && cachedPosts !== null;
  const [posts, setPosts] = useState<PostSummary[]>(initialPosts ?? cachedPosts ?? []);
  const [loading, setLoading] = useState(!hasInitialPosts && !hasCached);

  useEffect(() => {
    if (hasInitialPosts) return;
    if (cachedPosts !== null) {
      setPosts(cachedPosts);
      setLoading(false);
      return;
    }

    getClientPosts()
      .then((result) => {
        if (result) {
          cachedPosts = result;
          setPosts(result);
        }
      })
      .catch(() => {
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [hasInitialPosts]);

  return (
    <div className="container">
      <Header activeTab="posts" />
      <div id="posts-section" className="content-section">
        <div className="posts-section-content mx-auto mt-8 max-w-[1200px] px-4 pb-16">
          <div className="posts-list loading-element flex flex-col gap-8">
            {loading && posts.length === 0 ? (
              <PostsSkeleton />
            ) : posts.length === 0 ? (
              <div className="p-8 text-center italic text-[#9ca3af]"><p>No posts yet.</p></div>
            ) : (
              posts.map((post, index) => (
                <Link key={post.slug} to={`/posts/${post.slug}`} className="posts-card-link">
                  <div className={`posts-card ${COLOR_VARIANTS[index % COLOR_VARIANTS.length]}`}>
                    <h3>{post.title}</h3>
                    <p className="posts-card-date">{post.formattedDate}</p>
                    <p className="posts-card-excerpt">{post.excerpt}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
