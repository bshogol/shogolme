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

  const { data: searchResults } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchPosts(debouncedQuery),
    enabled: isOpen && debouncedQuery.length >= 2,
  });

  const isSearching = debouncedQuery.length >= 2;

  const items: CommandItem[] = [];

  if (isSearching && searchResults) {
    for (const result of searchResults) {
      items.push({
        id: `search-${result.slug}`,
        label: result.title,
        sublabel: result.excerpt,
        snippet: result.snippet,
        icon: <FileText size={15} />,
        action: () => { navigate(`/post/${result.slug}`); close(); },
      });
    }
  } else {
    items.push({
      id: 'home',
      label: 'Home',
      sublabel: 'Go to post list',
      icon: <Home size={15} />,
      action: () => { navigate('/'); close(); },
    });
    items.push({
      id: 'tags-page',
      label: 'Tags',
      sublabel: 'Browse all tags',
      icon: <Tag size={15} />,
      action: () => { navigate('/tags'); close(); },
    });

    if (series) {
      for (const s of series) {
        items.push({
          id: `series-${s.slug}`,
          label: s.name,
          sublabel: s.description,
          icon: <BookOpen size={15} />,
          action: () => { navigate(`/series/${s.slug}`); close(); },
        });
      }
    }

    if (posts) {
      for (const post of posts) {
        items.push({
          id: `post-${post.slug}`,
          label: post.title,
          sublabel: post.excerpt,
          icon: <FileText size={15} />,
          action: () => { navigate(`/post/${post.slug}`); close(); },
        });
      }
    }

    if (tags) {
      for (const tag of tags) {
        items.push({
          id: `tag-${tag}`,
          label: `#${tag}`,
          sublabel: `Filter posts by ${tag}`,
          icon: <Tag size={15} />,
          action: () => { navigate(`/?tag=${tag}`); close(); },
        });
      }
    }
  }

  const q = query.toLowerCase();
  const filtered = (!isSearching && q)
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.sublabel?.toLowerCase().includes(q)
      )
    : items;

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

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/60"
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-lg px-4"
          >
            <div className="bg-[#0a0a0a] border border-[#1e1e32] rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#111]">
                <Search size={16} className="text-df-text-dim shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search posts, tags, pages..."
                  className="flex-1 bg-transparent text-[15px] text-df-text-bright placeholder:text-df-text-dim outline-none"
                />
                <kbd className="text-[11px] border border-[#1e1e32] rounded px-1.5 py-0.5 text-df-text-dim">
                  esc
                </kbd>
              </div>

              <div className="max-h-80 overflow-y-auto py-1">
                {filtered.length === 0 && (
                  <div className="px-4 py-8 text-center text-[14px] text-df-text-dim">
                    No results for "{query}"
                  </div>
                )}
                {filtered.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === selectedIndex
                        ? 'bg-[#0a0a10] text-df-accent'
                        : 'text-df-text hover:bg-[#050508]'
                    )}
                  >
                    <span className="shrink-0 text-df-text-dim">{item.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[14px] font-medium">{item.label}</span>
                      {item.snippet ? (
                        <span
                          className="block text-[13px] text-df-text-dim mt-0.5 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: item.snippet }}
                        />
                      ) : item.sublabel ? (
                        <span className="block truncate text-[13px] text-df-text-dim mt-0.5">
                          {item.sublabel}
                        </span>
                      ) : null}
                    </span>
                    {i === selectedIndex && (
                      <ArrowRight size={13} className="shrink-0 text-df-accent" />
                    )}
                  </button>
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-[#111] flex items-center gap-4 text-[11px] text-df-text-dim">
                <span className="flex items-center gap-1">
                  <kbd className="border border-[#1e1e32] rounded px-1 py-0.5">↑↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-[#1e1e32] rounded px-1 py-0.5">↵</kbd> select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-[#1e1e32] rounded px-1 py-0.5">esc</kbd> close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
