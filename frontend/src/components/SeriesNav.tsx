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
    <div className="border border-df-border rounded-xl p-5 mb-10">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={15} className="text-df-accent" />
        <Link
          to={`/series/${series.slug}`}
          className="text-[14px] font-semibold text-df-accent hover:text-df-accent-hover transition-colors"
        >
          {series.name}
        </Link>
        <span className="text-[12px] text-df-text-dim ml-auto font-medium">
          Part {currentIdx + 1} of {series.posts.length}
        </span>
      </div>

      <ul className="space-y-1 text-[14px] mb-4">
        {series.posts.map((post, i) => (
          <li key={post.id}>
            {post.slug === currentSlug ? (
              <span className="flex items-center gap-2.5 py-1 text-df-accent font-medium">
                <span className="text-df-text-dim w-5 text-right text-[13px]">{i + 1}.</span>
                {post.title}
              </span>
            ) : (
              <Link
                to={`/post/${post.slug}`}
                className="flex items-center gap-2.5 py-1 text-df-text-dim hover:text-df-text transition-colors"
              >
                <span className="w-5 text-right text-[13px]">{i + 1}.</span>
                {post.title}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {(prev || next) && (
        <div className="flex justify-between pt-3 border-t border-[#111]">
          {prev ? (
            <Link
              to={`/post/${prev.slug}`}
              className="flex items-center gap-1 text-[13px] text-df-text-dim hover:text-df-accent transition-colors"
            >
              <ChevronLeft size={13} />
              Previous
            </Link>
          ) : <span />}
          {next ? (
            <Link
              to={`/post/${next.slug}`}
              className="flex items-center gap-1 text-[13px] text-df-text-dim hover:text-df-accent transition-colors"
            >
              Next
              <ChevronRight size={13} />
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
