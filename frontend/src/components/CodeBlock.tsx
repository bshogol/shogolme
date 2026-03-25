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
        <span className="absolute top-0 left-4 px-2 py-0.5 text-[10px] uppercase tracking-wider text-df-text-dim bg-[#0a0a10] rounded-b font-medium">
          {lang}
        </span>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-df-text-dim hover:text-df-text-bright hover:bg-[#0f0f18] opacity-0 group-hover:opacity-100 transition-colors"
        aria-label="Copy code"
      >
        {copied ? <Check size={14} className="text-df-green" /> : <Copy size={14} />}
      </button>
      <pre ref={preRef} className={className}>
        {children}
      </pre>
    </div>
  );
}
