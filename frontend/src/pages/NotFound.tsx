import { Link } from 'react-router-dom';
import { Home, Search, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchPosts } from '../api/posts';
import { useCommandPalette } from '../store/commandPalette';

export function NotFound() {
  const openPalette = useCommandPalette((s) => s.open);

  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetchPosts(),
  });

  const recent = posts?.slice(0, 5) ?? [];

  return (
    <div className="max-w-xl mx-auto px-6 py-32">
      <div className="text-center mb-16">
        <div className="text-[clamp(4rem,10vw,7rem)] font-bold text-df-text-bright tracking-[-0.04em] leading-none mb-4">404</div>
        <p className="text-[17px] text-df-text mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-df-accent text-white text-[15px] font-medium rounded-full px-8 py-3 hover:bg-df-accent-hover transition-colors"
          >
            <Home size={16} />
            Home
          </Link>
          <button
            onClick={openPalette}
            className="inline-flex items-center gap-2 border border-df-border text-df-text text-[15px] font-medium rounded-full px-8 py-3 hover:border-df-border-hover hover:text-df-text-bright transition-colors"
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="text-[13px] text-df-text-dim uppercase tracking-widest font-medium mb-4">
            Recent posts
          </h2>
          <div className="space-y-1">
            {recent.map((post) => (
              <Link
                key={post.id}
                to={`/post/${post.slug}`}
                className="group block py-3 px-4 -mx-4 rounded-lg hover:bg-[#050508] transition-colors"
              >
                <span className="text-[15px] text-df-text-bright group-hover:text-df-accent transition-colors">
                  {post.title}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-df-text-dim mt-1">
                  <Calendar size={11} />
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
