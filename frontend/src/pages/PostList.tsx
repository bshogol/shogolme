import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, ChevronRight, Eye, BookOpen } from 'lucide-react';
import { fetchPosts, fetchPost, fetchTagsWithCount } from '../api/posts';

export function PostList() {
  const [searchParams] = useSearchParams();
  const tag = searchParams.get('tag') ?? undefined;
  const queryClient = useQueryClient();

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts', tag],
    queryFn: () => fetchPosts(tag),
  });

  const { data: tags } = useQuery({
    queryKey: ['tags-with-count'],
    queryFn: fetchTagsWithCount,
  });

  const prefetch = (slug: string) => {
    queryClient.prefetchQuery({
      queryKey: ['post', slug],
      queryFn: () => fetchPost(slug),
      staleTime: 60_000,
    });
  };

  const popularTags = tags?.slice(0, 8) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 sm:py-32">
      {/* Section label */}
      <div className="mb-4">
        <span className="text-[13px] text-df-accent font-medium tracking-widest uppercase">
          {tag ? `Tagged: ${tag}` : 'Latest Posts'}
        </span>
      </div>

      <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] font-bold text-df-text-bright tracking-[-0.03em] leading-[1.1] mb-6">
        {tag ? (
          <>Posts tagged <span className="text-df-accent">#{tag}</span></>
        ) : (
          'All Posts'
        )}
      </h1>

      {tag && (
        <Link to="/" className="text-[14px] text-df-accent hover:text-df-accent-hover transition-colors mb-8 inline-block">
          ← Clear filter
        </Link>
      )}

      {/* Popular tags */}
      {!tag && popularTags.length > 0 && (
        <div className="mb-10 flex flex-wrap items-center gap-2">
          {popularTags.map((t) => (
            <Link
              key={t.name}
              to={`/?tag=${t.name}`}
              className="px-3 py-1 text-[13px] rounded-full border border-df-border text-df-text hover:border-df-border-hover hover:text-df-text-bright transition-colors"
            >
              {t.name}
              <span className="text-df-text-dim ml-1">({t.count})</span>
            </Link>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="text-df-text-dim text-[15px] animate-pulse py-8">
          Loading posts...
        </div>
      )}

      {error && (
        <div className="text-df-red text-[15px] border border-df-border rounded-xl px-6 py-4 bg-[#050508]">
          Failed to fetch posts. Is the backend running?
        </div>
      )}

      {posts && posts.length === 0 && (
        <div className="text-df-text-dim text-[15px] py-8">
          No posts found.
        </div>
      )}

      {posts && posts.length > 0 && (
        <div className="space-y-1">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/post/${post.slug}`}
              onMouseEnter={() => prefetch(post.slug)}
              className="group block px-5 py-5 -mx-5 rounded-xl border border-transparent hover:border-df-border hover:bg-[#050508] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h2 className="text-[17px] font-bold text-df-text-bright group-hover:text-df-accent transition-colors truncate">
                      {post.title}
                    </h2>
                    {post.series_id && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-df-accent shrink-0">
                        <BookOpen size={11} />
                        pt.{post.series_order}
                      </span>
                    )}
                  </div>
                  {post.excerpt && (
                    <p className="text-[15px] text-df-text line-clamp-1 mb-2">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[13px] text-df-text-dim">
                      <Calendar size={12} />
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {post.view_count > 0 && (
                      <span className="flex items-center gap-1 text-[13px] text-df-text-dim">
                        <Eye size={12} />
                        {post.view_count}
                      </span>
                    )}
                    {post.tags.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {post.tags.map((t) => (
                          <span key={t} className="text-[12px] text-df-text-dim">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-df-text-dim group-hover:text-df-accent transition-colors mt-1.5 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
