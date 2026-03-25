import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Tag, Home, ArrowRight, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/cn';
import { useCommandPalette } from '../store/commandPalette';
import { fetchPosts, fetchTags, searchPosts, fetchSeries } from '../api/posts';

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  snippet?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetchPosts(),
    enabled: isOpen,
  });

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
    enabled: isOpen,
  });

  const { data: series } = useQuery({
    queryKey: ['series'],
    queryFn: fetchSeries,
    enabled: isOpen,
  });

  // FTS search when query is long enough
  const { data: searchResults } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchPosts(debouncedQuery),
    enabled: isOpen && debouncedQuery.length >= 2,
  });

  const isSearching = debouncedQuery.length >= 2;

  // Build command items
  const items: CommandItem[] = [];

  if (isSearching && searchResults) {
    // Show FTS search results
    for (const result of searchResults) {
      items.push({
        id: `search-${result.slug}`,
        label: result.title,
        sublabel: result.excerpt,
        snippet: result.snippet,
        icon: <FileText size={14} />,
        action: () => { navigate(`/post/${result.slug}`); close(); },
      });
    }
  } else {
    // Show browseable items
    items.push({
      id: 'home',
      label: 'Home',
      sublabel: 'Go to post list',
      icon: <Home size={14} />,
      action: () => { navigate('/'); close(); },
    });
    items.push({
      id: 'tags-page',
      label: 'Tags',
      sublabel: 'Browse all tags',
      icon: <Tag size={14} />,
      action: () => { navigate('/tags'); close(); },
    });

    // Series
    if (series) {
      for (const s of series) {
        items.push({
          id: `series-${s.slug}`,
          label: s.name,
          sublabel: s.description,
          icon: <BookOpen size={14} />,
          action: () => { navigate(`/series/${s.slug}`); close(); },
        });
      }
    }

    // Posts
    if (posts) {
      for (const post of posts) {
        items.push({
          id: `post-${post.slug}`,
          label: post.title,
          sublabel: post.excerpt,
          icon: <FileText size={14} />,
          action: () => { navigate(`/post/${post.slug}`); close(); },
        });
      }
    }

    // Tags
    if (tags) {
      for (const tag of tags) {
        items.push({
          id: `tag-${tag}`,
          label: `#${tag}`,
          sublabel: `Filter posts by ${tag}`,
          icon: <Tag size={14} />,
          action: () => { navigate(`/?tag=${tag}`); close(); },
        });
      }
    }
  }

  // Client-side filter for non-search mode
  const q = query.toLowerCase();
  const filtered = (!isSearching && q)
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.sublabel?.toLowerCase().includes(q)
      )
    : items;

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useCommandPalette.getState().toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection on filter change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-lg"
          >
            <div className="bg-terminal-surface border border-terminal-border rounded-lg shadow-2xl overflow-hidden font-mono">
              {/* Search input */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-terminal-border">
                <Search size={14} className="text-terminal-text-dim shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search posts, tags, pages..."
                  className="flex-1 bg-transparent text-sm text-terminal-text-bright placeholder:text-terminal-text-dim outline-none"
                />
                <kbd className="text-[10px] border border-terminal-border rounded px-1.5 py-0.5 text-terminal-text-dim">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto py-1">
                {filtered.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-terminal-text-dim">
                    No results for "{query}"
                  </div>
                )}
                {filtered.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-left text-xs transition-colors',
                      i === selectedIndex
                        ? 'bg-terminal-accent/10 text-terminal-accent'
                        : 'text-terminal-text hover:bg-terminal-border/30'
                    )}
                  >
                    <span className="shrink-0 text-terminal-text-dim">{item.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{item.label}</span>
                      {item.snippet ? (
                        <span
                          className="block text-[11px] text-terminal-text-dim mt-0.5 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: item.snippet }}
                        />
                      ) : item.sublabel ? (
                        <span className="block truncate text-[11px] text-terminal-text-dim mt-0.5">
                          {item.sublabel}
                        </span>
                      ) : null}
                    </span>
                    {i === selectedIndex && (
                      <ArrowRight size={12} className="shrink-0 text-terminal-accent" />
                    )}
                  </button>
                ))}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-terminal-border flex items-center gap-3 text-[10px] text-terminal-text-dim">
                <span className="flex items-center gap-1">
                  <kbd className="border border-terminal-border rounded px-1 py-0.5">↑↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-terminal-border rounded px-1 py-0.5">↵</kbd> select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-terminal-border rounded px-1 py-0.5">esc</kbd> close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
