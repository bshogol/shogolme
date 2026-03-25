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
      <div className="max-w-4xl mx-auto px-6 py-24 text-df-text-dim text-[15px] animate-pulse">
        Loading series...
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-df-red text-[15px] border border-df-border rounded-xl px-6 py-4">
          Series not found.
        </div>
        <Link to="/" className="text-[14px] text-df-accent mt-4 inline-block">
          ← Back to posts
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 sm:py-32">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[14px] text-df-accent hover:text-df-accent-hover transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        Back
      </Link>

      <span className="text-[13px] text-df-accent font-medium tracking-widest uppercase mb-4 block">
        Series
      </span>

      <div className="flex items-center gap-3 mb-3">
        <BookOpen size={22} className="text-df-accent" />
        <h1 className="text-[clamp(2rem,5vw,2.75rem)] font-bold text-df-text-bright tracking-[-0.03em]">{series.name}</h1>
      </div>

      {series.description && (
        <p className="text-[17px] text-df-text leading-relaxed mb-8 max-w-2xl">{series.description}</p>
      )}

      <p className="text-[13px] text-df-text-dim mb-6">
        {series.posts.length} part{series.posts.length !== 1 ? 's' : ''}
      </p>

      <div className="space-y-1">
        {series.posts.map((post) => (
          <Link
            key={post.id}
            to={`/post/${post.slug}`}
            className="group flex items-center gap-4 px-5 py-4 -mx-5 rounded-xl border border-transparent hover:border-df-border hover:bg-[#050508] transition-colors"
          >
            <span className="text-df-text-dim text-[14px] w-6 text-right shrink-0 font-medium">
              {post.series_order}.
            </span>
            <span className="text-[17px] font-bold text-df-text-bright group-hover:text-df-accent transition-colors truncate flex-1">
              {post.title}
            </span>
            <ChevronRight size={16} className="text-df-text-dim group-hover:text-df-accent transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
