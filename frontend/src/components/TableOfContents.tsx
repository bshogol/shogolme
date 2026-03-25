import { useEffect, useState } from 'react';
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
    <nav className="sticky top-20">
      <div className="text-[12px] text-df-text-dim mb-4 uppercase tracking-wider font-medium">
        On this page
      </div>
      <ul className="space-y-0.5 text-[13px] border-l border-[#111]">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                'block py-1 transition-colors border-l -ml-px',
                item.level <= 2 && 'pl-3',
                item.level === 3 && 'pl-6',
                item.level === 4 && 'pl-9',
                activeId === item.id
                  ? 'text-df-accent border-df-accent'
                  : 'text-df-text-dim hover:text-df-text border-transparent'
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
