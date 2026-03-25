import { useEffect, useState } from 'react';
import { List } from 'lucide-react';
import { cn } from '../lib/cn';
import type { TOCItem } from '../types/blog';

interface Props {
  items: TOCItem[];
}

export function TableOfContents({ items }: Props) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="sticky top-16">
      <div className="flex items-center gap-2 text-xs text-terminal-text-dim mb-3 uppercase tracking-wider">
        <List size={12} />
        <span>On this page</span>
      </div>
      <ul className="space-y-0.5 text-xs border-l border-terminal-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                'block py-1 transition-colors border-l -ml-px',
                item.level === 1 && 'pl-3',
                item.level === 2 && 'pl-3',
                item.level === 3 && 'pl-6',
                item.level === 4 && 'pl-9',
                activeId === item.id
                  ? 'text-terminal-accent border-terminal-accent'
                  : 'text-terminal-text-dim hover:text-terminal-text border-transparent'
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
