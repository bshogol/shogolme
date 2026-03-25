import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, ChevronRight, Tag, FileText, Eye, Hash, BookOpen } from 'lucide-react';
import { fetchPosts, fetchPost, fetchTagsWithCount } from '../api/posts';
import { cn } from '../lib/cn';

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
    <div className="px-4 py-8 max-w-3xl mx-auto">
      {/* Terminal prompt header */}
      <div className="mb-6">
        <div className="text-sm text-terminal-text-dim mb-1">
          <span className="text-terminal-green">$</span> ls {tag ? `-t ${tag}` : '-la'} ./posts/
        </div>
        <h1 className="text-xl font-semibold text-terminal-text-bright">
          {tag ? (
            <>Posts tagged <span className="text-terminal-accent">#{tag}</span></>
          ) : (
            'All Posts'
          )}
        </h1>
        {tag && (
          <Link to="/" className="text-xs text-terminal-text-dim hover:text-terminal-accent transition-colors mt-1 inline-block">
            ← clear filter
          </Link>
        )}
      </div>

      {/* Popular tags */}
      {!tag && popularTags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-terminal-text-dim mr-1">popular:</span>
          {popularTags.map((t) => (
            <Link
              key={t.name}
              to={`/?tag=${t.name}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded border border-terminal-border text-terminal-accent hover:border-terminal-accent hover:text-terminal-accent transition-colors"
            >
              <Hash size={10} />
              {t.name}
              <span className="text-terminal-text-dim">({t.count})</span>
            </Link>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="text-terminal-text-dim text-sm animate-pulse">
          <span className="text-terminal-yellow">⟳</span> Loading posts...
        </div>
      )}

      {error && (
        <div className="text-terminal-red text-sm border border-terminal-red/30 rounded px-3 py-2 bg-terminal-red/5">
          <span className="font-semibold">error:</span> Failed to fetch posts. Is the backend running?
        </div>
      )}

      {posts && posts.length === 0 && (
        <div className="text-terminal-text-dim text-sm">
          <span className="text-terminal-yellow">!</span> No posts found.
        </div>
      )}

      {posts && posts.length > 0 && (
        <div className="space-y-1">
          {posts.map((post, i) => (
            <Link
              key={post.id}
              to={`/post/${post.slug}`}
              onMouseEnter={() => prefetch(post.slug)}
              className={cn(
                'group block px-3 py-3 -mx-3 rounded transition-colors',
                'hover:bg-terminal-surface border border-transparent hover:border-terminal-border'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-terminal-text-dim text-xs font-mono">
                      {String(i).padStart(2, '0')}
                    </span>
                    <FileText size={13} className="text-terminal-text-dim shrink-0" />
                    <span className="text-sm font-medium text-terminal-text-bright group-hover:text-terminal-accent transition-colors truncate">
                      {post.title}
                    </span>
                    {post.series_id && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-terminal-accent shrink-0">
                        <BookOpen size={10} />
                        pt.{post.series_order}
                      </span>
                    )}
                  </div>
                  {post.excerpt && (
                    <p className="text-xs text-terminal-text-dim ml-9 line-clamp-1">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 ml-9">
                    <span className="flex items-center gap-1 text-xs text-terminal-text-dim">
                      <Calendar size={11} />
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {post.view_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-terminal-text-dim">
                        <Eye size={11} />
                        {post.view_count}
                      </span>
                    )}
                    {post.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag size={11} className="text-terminal-text-dim" />
                        {post.tags.map((t) => (
                          <span key={t} className="text-xs text-terminal-accent">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight size={14} className="text-terminal-text-dim group-hover:text-terminal-accent transition-colors mt-1 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom prompt */}
      <div className="mt-8 text-xs text-terminal-text-dim">
        <span className="text-terminal-green">$</span> <span className="animate-pulse">▊</span>
      </div>
    </div>
  );
}
