import { useState, useCallback, useEffect, useRef } from 'react';
import { useNews, type NewsPost } from '../hooks/useNews';
import { useUnreadNews } from '../hooks/useUnreadNews';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../lib/utils';

function NewsCard({ post, onVisible }: { post: NewsPost; onVisible: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible(post.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [post.id, onVisible]);

  const shouldTruncate = post.body.length > 300;
  const displayBody = shouldTruncate && !expanded
    ? post.body.slice(0, 300) + '...'
    : post.body;

  return (
    <Card ref={cardRef} className="overflow-hidden">
      {post.image_url && (
        <img
          src={post.image_url}
          alt={post.title}
          className="w-full h-56 object-cover"
        />
      )}
      <div className="p-5 space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
        <p className="text-sm text-gray-600 whitespace-pre-line">{displayBody}</p>
        {shouldTruncate && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Read More
          </button>
        )}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            {post.published_at ? formatDate(post.published_at) : formatDate(post.created_at)}
          </p>
          {post.external_link && (
            <a
              href={post.external_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm">
                Read More &rarr;
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

export function GalleryNewsPage() {
  const { posts, loading } = useNews({ publishedOnly: true });
  const { markAsRead } = useUnreadNews();

  const handleVisible = useCallback((newsId: string) => {
    markAsRead(newsId);
  }, [markAsRead]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">News</h1>
        <p className="mt-1 text-sm text-gray-500">
          Latest updates from NOA Contemporary.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : posts.length === 0 ? (
        <EmptyState
          title="No news posted yet"
          description="Check back later for updates from NOA Contemporary."
        />
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} onVisible={handleVisible} />
          ))}
        </div>
      )}
    </div>
  );
}
