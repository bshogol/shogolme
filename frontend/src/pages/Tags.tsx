import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchTagsWithCount } from '../api/posts';

export function Tags() {
  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags-with-count'],
    queryFn: fetchTagsWithCount,
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 sm:py-32">
      <span className="text-[13px] text-df-accent font-medium tracking-widest uppercase mb-4 block">
        Browse
      </span>
      <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] font-bold text-df-text-bright tracking-[-0.03em] leading-[1.1] mb-10">
        Tags
      </h1>

      {isLoading && (
        <div className="text-df-text-dim text-[15px] animate-pulse">
          Loading tags...
        </div>
      )}

      {tags && (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <Link
              key={tag.name}
              to={`/?tag=${tag.name}`}
              className="px-4 py-2 text-[14px] rounded-full border border-df-border text-df-text hover:border-df-border-hover hover:text-df-text-bright transition-colors"
            >
              {tag.name}
              <span className="text-df-text-dim ml-1.5">({tag.count})</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
