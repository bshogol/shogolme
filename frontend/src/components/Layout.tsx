import { Outlet, Link, useLocation } from 'react-router-dom';
import { Search, Rss } from 'lucide-react';
import { cn } from '../lib/cn';
import { useCommandPalette } from '../store/commandPalette';

export function Layout() {
  const location = useLocation();
  const openPalette = useCommandPalette((s) => s.open);

  return (
    <div className="min-h-screen bg-df-bg text-df-text font-sans">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-df-accent h-14">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-white p-0.5 flex items-center justify-center">
              <span className="text-df-accent text-[11px] font-bold">b</span>
            </div>
            <span className="text-[16px] font-bold text-white">blog</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/" label="Home" current={location.pathname === '/'} />
            <NavLink to="/tags" label="Tags" current={location.pathname === '/tags'} />
            <button
              onClick={openPalette}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[15px] font-semibold text-white hover:text-white/80 transition-colors"
            >
              <Search size={15} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-flex ml-1 text-[11px] border border-white/30 rounded px-1.5 py-0.5 text-white/50 font-normal">
                ⌘K
              </kbd>
            </button>
          </nav>
        </div>
      </header>

      {/* Spacer for fixed nav */}
      <div className="h-14" />

      {/* Main content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#111] bg-[#050508]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <span className="text-[13px] text-df-text-dim">
            Built with Go + React
          </span>
          <a href="/feed.xml" className="flex items-center gap-1.5 text-[13px] text-df-text-dim hover:text-df-text transition-colors">
            <Rss size={13} />
            RSS
          </a>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, label, current }: { to: string; label: string; current: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        'px-3 py-1.5 rounded-lg text-[15px] font-semibold transition-colors',
        current
          ? 'text-white'
          : 'text-white/70 hover:text-white'
      )}
    >
      {label}
    </Link>
  );
}
