import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { articlePath, pad2 } from "../lib/content";
import { search } from "../lib/search";
import { SearchIcon } from "./SiteHeader";

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const hits = useMemo(() => search(query, 8), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const restore = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      restore?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const go = (index: number) => {
    const hit = hits[index];
    if (!hit) return;
    navigate(articlePath(hit.article));
    onClose();
  };

  return (
    <div className="palette-scrim" onClick={onClose} role="presentation">
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search articles"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="palette-field">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search articles, series, sections…"
            aria-label="Search articles"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((i) => Math.min(i + 1, hits.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                go(active);
              }
            }}
          />
          <kbd className="mono">Esc</kbd>
        </div>

        {query && (
          <ul className="palette-results">
            {hits.map((hit, index) => (
              <li key={hit.article.key}>
                <button
                  className={`palette-hit${index === active ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(index)}
                >
                  <span className="mono palette-hit-num">{pad2(hit.article.part)}</span>
                  <span className="palette-hit-text">
                    <span className="palette-hit-title">{hit.article.title}</span>
                    <span className="palette-hit-sub">
                      {hit.heading ? `§ ${hit.heading}` : hit.article.dek}
                    </span>
                  </span>
                  <span className="mono palette-hit-series">{hit.article.seriesTitle}</span>
                </button>
              </li>
            ))}
            {!hits.length && <li className="palette-empty">No article matches “{query}”.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
