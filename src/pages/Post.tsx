import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { getClientPostPage } from '../lib/client-posts';
import type { PostPageData } from '../types';

interface PostPageProps {
  data?: PostPageData;
}

function PostSkeleton() {
  return (
    <article className="post-article post-article-skeleton loading-element mx-auto max-w-[800px] px-4" aria-hidden="true">
      <header className="post-header">
        <div className="skeleton-line post-skeleton-title"></div>
        <div className="skeleton-line post-skeleton-date"></div>
      </header>

      <div className="post-content post-skeleton-content">
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line skeleton-line-short"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line skeleton-line-medium"></div>
      </div>
    </article>
  );
}

export function PostPage({ data: initialData }: PostPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PostPageData | null>(initialData?.post ? initialData : null);
  const [loading, setLoading] = useState(initialData === undefined);

  useEffect(() => {
    if (initialData && !initialData.post) return;
    if (initialData?.post?.slug === slug) return;
    if (!slug) return;

    setData(null);
    setLoading(true);

    getClientPostPage(slug)
      .then((result) => {
        if (result) setData(result);
      })
      .catch(() => {
        setData({ post: null, prevPost: null, nextPost: null });
      })
      .finally(() => setLoading(false));
  }, [slug, initialData]);

  if (loading) {
    return (
      <div className="container">
        <Header activeTab="posts" />
        <div id="posts-post-section" className="content-section">
          <PostSkeleton />
        </div>
      </div>
    );
  }

  if (!data?.post) {
    return (
      <div className="container">
        <Header activeTab="posts" />
        <div className="content-section"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header activeTab="posts" />
      <div id="posts-post-section" className="content-section">
        <article className="post-article loading-element mx-auto max-w-[800px] px-4">
          <header className="post-header">
            <h1 className="post-title">{data.post.title}</h1>
            <p className="post-date">{data.post.formattedDate}</p>
          </header>

          <div className="post-content" dangerouslySetInnerHTML={{ __html: data.post.html }} />

          <nav className="post-navigation">
            {data.prevPost ? (
              <Link to={`/posts/${data.prevPost.slug}`} className="nav-link nav-prev">
                <span className="nav-arrow">←</span>
                <span className="nav-title">{data.prevPost.title}</span>
              </Link>
            ) : (
              <div className="nav-spacer"></div>
            )}

            {data.nextPost ? (
              <Link to={`/posts/${data.nextPost.slug}`} className="nav-link nav-next">
                <span className="nav-title">{data.nextPost.title}</span>
                <span className="nav-arrow">→</span>
              </Link>
            ) : (
              <div className="nav-spacer"></div>
            )}
          </nav>
        </article>
      </div>
    </div>
  );
}
