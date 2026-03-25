import { useState } from 'react';
import { ChevronDown, List } from 'lucide-react';
import { cn } from '../lib/cn';
import type { TOCItem } from '../types/blog';

interface Props {
  items: TOCItem[];
}

export function MobileTOC({ items }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden mb-6 border border-terminal-border rounded bg-terminal-surface">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-terminal-text-dim hover:text-terminal-text transition-colors"
      >
        <span className="flex items-center gap-2">
          <List size={12} />
          On this page
        </span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="px-3 pb-3 space-y-0.5 text-xs border-t border-terminal-border pt-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  'block py-0.5 text-terminal-text-dim hover:text-terminal-accent transition-colors',
                  item.level === 1 && 'pl-0',
                  item.level === 2 && 'pl-0',
                  item.level === 3 && 'pl-3',
                  item.level === 4 && 'pl-6',
                )}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
