import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidId = 0;

interface Props {
  code: string;
}

export function MermaidBlock({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        fontFamily: 'var(--font-mono)',
      });

      const id = `mermaid-${++mermaidId}`;
      try {
        const { svg } = await mermaid.render(id, code);
        containerRef.current.innerHTML = svg;
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to render diagram');
        containerRef.current.innerHTML = '';
      }
    };

    render();
  }, [code]);

  return (
    <div className="my-4">
      {error && (
        <div className="text-xs text-terminal-red border border-terminal-red/30 rounded px-3 py-2 bg-terminal-red/5 mb-2">
          mermaid error: {error}
        </div>
      )}
      <div
        ref={containerRef}
        className="flex justify-center overflow-x-auto [&_svg]:max-w-full"
      />
      {error && (
        <pre className="text-xs text-terminal-text-dim mt-2 p-3 border border-terminal-border rounded bg-terminal-surface overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
