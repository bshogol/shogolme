import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Tag, Hash } from 'lucide-react';
import { fetchTagsWithCount } from '../api/posts';

export function Tags() {
  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags-with-count'],
    queryFn: fetchTagsWithCount,
  });

  return (
    <div className="px-4 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="text-sm text-terminal-text-dim mb-1">
          <span className="text-terminal-green">$</span> ls ./tags/
        </div>
        <h1 className="text-xl font-semibold text-terminal-text-bright flex items-center gap-2">
          <Tag size={18} />
          Tags
        </h1>
      </div>

      {isLoading && (
        <div className="text-terminal-text-dim text-sm animate-pulse">
          <span className="text-terminal-yellow">⟳</span> Loading tags...
        </div>
      )}

      {tags && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag.name}
              to={`/?tag=${tag.name}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-terminal-border text-terminal-accent hover:border-terminal-accent hover:text-terminal-accent transition-colors bg-terminal-surface"
            >
              <Hash size={12} />
              {tag.name}
              <span className="text-terminal-text-dim ml-0.5">({tag.count})</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 text-xs text-terminal-text-dim">
        <span className="text-terminal-green">$</span> <span className="animate-pulse">▊</span>
      </div>
    </div>
  );
}
