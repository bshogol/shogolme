import { Outlet, Link, useLocation } from 'react-router-dom';
import { Terminal, Tag, Home, Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { useCommandPalette } from '../store/commandPalette';

export function Layout() {
  const location = useLocation();
  const openPalette = useCommandPalette((s) => s.open);

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text font-mono flex justify-center transition-colors duration-200">
      <div className="w-full max-w-5xl min-h-screen border-x border-terminal-border bg-terminal-surface flex flex-col transition-colors duration-200">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-terminal-accent transition-colors duration-200">
          <div className="px-4 h-10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-white/90 hover:text-white transition-colors">
              <Terminal size={14} />
              <span className="text-xs font-semibold">
                <span className="text-white/60">~/</span>blog
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              <NavLink to="/" icon={<Home size={13} />} label="home" current={location.pathname === '/'} />
              <NavLink to="/tags" icon={<Tag size={13} />} label="tags" current={location.pathname === '/tags'} />
              <button
                onClick={openPalette}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Search size={13} />
                <span className="hidden sm:inline">search</span>
                <kbd className="hidden sm:inline-flex ml-1 text-[10px] border border-white/30 rounded px-1 py-0.5 text-white/50">
                  ⌘K
                </kbd>
              </button>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-terminal-border transition-colors duration-200">
          <div className="px-4 py-3 text-center text-xs text-terminal-text-dim">
            <span className="text-terminal-green">$</span> echo "built with go + react" <span className="text-terminal-text-dim">|</span> <span className="text-terminal-accent">stdout</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NavLink({ to, icon, label, current }: { to: string; icon: React.ReactNode; label: string; current: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors',
        current
          ? 'bg-white/20 text-white'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
