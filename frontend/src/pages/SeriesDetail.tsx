import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, ChevronRight } from 'lucide-react';
import { fetchSeriesBySlug } from '../api/posts';

export function SeriesDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: series, isLoading, error } = useQuery({
    queryKey: ['series', slug],
    queryFn: () => fetchSeriesBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="px-4 py-8 max-w-3xl mx-auto text-terminal-text-dim text-sm animate-pulse">
        <span className="text-terminal-yellow">⟳</span> Loading series...
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <div className="text-terminal-red text-sm border border-terminal-red/30 rounded px-3 py-2 bg-terminal-red/5">
          <span className="font-semibold">error:</span> Series not found.
        </div>
        <Link to="/" className="text-xs text-terminal-accent mt-4 inline-block hover:underline">
          ← back to posts
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-3xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-terminal-text-dim hover:text-terminal-accent transition-colors mb-6"
      >
        <ArrowLeft size={12} />
        cd ..
      </Link>

      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={18} className="text-terminal-accent" />
        <h1 className="text-xl font-semibold text-terminal-text-bright">{series.name}</h1>
      </div>

      {series.description && (
        <p className="text-sm text-terminal-text-dim mb-6">{series.description}</p>
      )}

      <div className="text-xs text-terminal-text-dim mb-4">
        {series.posts.length} part{series.posts.length !== 1 ? 's' : ''}
      </div>

      <div className="space-y-1">
        {series.posts.map((post) => (
          <Link
            key={post.id}
            to={`/post/${post.slug}`}
            className="group flex items-center gap-3 px-3 py-3 -mx-3 rounded hover:bg-terminal-surface border border-transparent hover:border-terminal-border transition-colors"
          >
            <span className="text-terminal-text-dim text-xs w-6 text-right shrink-0">
              {post.series_order}.
            </span>
            <span className="text-sm text-terminal-text-bright group-hover:text-terminal-accent transition-colors truncate flex-1">
              {post.title}
            </span>
            <ChevronRight size={14} className="text-terminal-text-dim group-hover:text-terminal-accent transition-colors shrink-0" />
          </Link>
        ))}
      </div>

      <div className="mt-8 text-xs text-terminal-text-dim">
        <span className="text-terminal-green">$</span> <span className="animate-pulse">▊</span>
      </div>
    </div>
  );
}
