import { useState, useRef, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

interface Props {
  className?: string;
  children?: ReactNode;
}

export function CodeBlock({ className, children }: Props) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const lang = className?.replace(/^language-/, '') ?? '';

  const handleCopy = async () => {
    const text = preRef.current?.textContent ?? '';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {lang && (
        <span className="absolute top-0 left-3 px-2 py-0.5 text-[10px] uppercase tracking-wider text-terminal-text-dim bg-terminal-border/50 rounded-b font-semibold">
          {lang}
        </span>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded text-terminal-text-dim hover:text-terminal-text-bright hover:bg-terminal-border/50 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Copy code"
      >
        {copied ? <Check size={14} className="text-terminal-green" /> : <Copy size={14} />}
      </button>
      <pre ref={preRef} className={className}>
        {children}
      </pre>
    </div>
  );
}
