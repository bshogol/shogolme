import { Link } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PostSeriesInfo } from '../types/blog';

interface Props {
  series: PostSeriesInfo;
  currentSlug: string;
}

export function SeriesNav({ series, currentSlug }: Props) {
  const currentIdx = series.posts.findIndex((p) => p.slug === currentSlug);
  const prev = currentIdx > 0 ? series.posts[currentIdx - 1] : null;
  const next = currentIdx < series.posts.length - 1 ? series.posts[currentIdx + 1] : null;

  return (
    <div className="border border-terminal-border rounded-lg bg-terminal-surface p-4 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={14} className="text-terminal-accent" />
        <Link
          to={`/series/${series.slug}`}
          className="text-xs font-semibold text-terminal-accent hover:underline"
        >
          {series.name}
        </Link>
        <span className="text-[10px] text-terminal-text-dim ml-auto">
          Part {currentIdx + 1} of {series.posts.length}
        </span>
      </div>

      <ul className="space-y-0.5 text-xs mb-3">
        {series.posts.map((post, i) => (
          <li key={post.id}>
            {post.slug === currentSlug ? (
              <span className="flex items-center gap-2 py-0.5 text-terminal-accent font-medium">
                <span className="text-terminal-text-dim w-4 text-right">{i + 1}.</span>
                {post.title}
              </span>
            ) : (
              <Link
                to={`/post/${post.slug}`}
                className="flex items-center gap-2 py-0.5 text-terminal-text-dim hover:text-terminal-text transition-colors"
              >
                <span className="w-4 text-right">{i + 1}.</span>
                {post.title}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {(prev || next) && (
        <div className="flex justify-between pt-2 border-t border-terminal-border">
          {prev ? (
            <Link
              to={`/post/${prev.slug}`}
              className="flex items-center gap-1 text-[11px] text-terminal-text-dim hover:text-terminal-accent transition-colors"
            >
              <ChevronLeft size={12} />
              Previous
            </Link>
          ) : <span />}
          {next ? (
            <Link
              to={`/post/${next.slug}`}
              className="flex items-center gap-1 text-[11px] text-terminal-text-dim hover:text-terminal-accent transition-colors"
            >
              Next
              <ChevronRight size={12} />
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
