import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="px-4 py-16 max-w-xl mx-auto text-center">
      <div className="text-6xl font-bold text-terminal-text-bright mb-2 font-mono">404</div>
      <div className="text-sm text-terminal-text-dim mb-6 font-mono">
        <span className="text-terminal-red">bash:</span> page not found: <span className="text-terminal-text-bright">$PATH</span>
      </div>

      <div className="border border-terminal-border rounded-lg bg-terminal-surface p-6 text-left text-xs font-mono mb-6">
        <div className="text-terminal-text-dim mb-1">
          <span className="text-terminal-green">$</span> cat /dev/null
        </div>
        <div className="text-terminal-text-dim mb-3">
          <span className="text-terminal-red">error:</span> the page you're looking for doesn't exist or has been moved.
        </div>
        <div className="text-terminal-text-dim">
          <span className="text-terminal-green">$</span> <span className="text-terminal-accent">cd</span> ~
        </div>
      </div>

      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 text-xs rounded border border-terminal-border text-terminal-accent hover:bg-terminal-accent/10 transition-colors"
      >
        <Home size={14} />
        back to home
      </Link>
    </div>
  );
}
