import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-6 py-32 text-center">
      <div className="text-[clamp(4rem,10vw,7rem)] font-bold text-df-text-bright tracking-[-0.04em] leading-none mb-4">404</div>
      <p className="text-[17px] text-df-text mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-df-accent text-white text-[15px] font-medium rounded-full px-8 py-3 hover:bg-df-accent-hover transition-colors"
      >
        <Home size={16} />
        Back to Home
      </Link>
    </div>
  );
}
