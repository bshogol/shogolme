import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';
import type { TOCItem } from '../types/blog';

interface Props {
  items: TOCItem[];
}

export function MobileTOC({ items }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden mb-8 border border-df-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-df-text-dim hover:text-df-text transition-colors"
      >
        <span className="font-medium">On this page</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="px-4 pb-3 space-y-1 text-[13px] border-t border-[#111] pt-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  'block py-0.5 text-df-text-dim hover:text-df-accent transition-colors',
                  item.level <= 2 && 'pl-0',
                  item.level === 3 && 'pl-4',
                  item.level === 4 && 'pl-8',
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
