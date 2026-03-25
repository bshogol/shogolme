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
    let cancelled = false;

    const render = async () => {
      if (!containerRef.current) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        fontFamily: 'Inter, system-ui, sans-serif',
      });

      const id = `mermaid-${++mermaidId}`;
      try {
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to render diagram');
          if (containerRef.current) containerRef.current.innerHTML = '';
        }
      }
    };

    render();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="my-4">
      {error && (
        <div className="text-xs text-df-red border border-df-border rounded px-3 py-2 mb-2">
          mermaid error: {error}
        </div>
      )}
      <div
        ref={containerRef}
        className="flex justify-center overflow-x-auto [&_svg]:max-w-full"
      />
      {error && (
        <pre className="text-xs text-df-text-dim mt-2 p-3 border border-df-border rounded overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
