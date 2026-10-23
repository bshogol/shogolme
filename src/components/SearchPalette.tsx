import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { onComboKeyDown, trapTab } from "../lib/combo";
import { articlePath, pad2 } from "../lib/content";
import { search } from "../lib/search";
import { SearchIcon } from "./SiteHeader";

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const navigate = useNavigate();

  const hits = useMemo(() => search(query, 8), [query]);
  const listId = "search-palette-list";
  const searching = query.trim().length > 0;
  const activeId = searching && hits[active] ? `search-palette-opt-${active}` : undefined;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const restore = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
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

  const resultLabel = searching ? `${hits.length} ${hits.length === 1 ? "result" : "results"}` : "";

  return (
    <div className="palette-scrim" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search articles"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          trapTab(event, dialogRef.current);
          onComboKeyDown(event, active, hits.length, setActive, go, onClose);
        }}
      >
        <div className="palette-field">
          <SearchIcon />
          <input
            ref={inputRef}
            role="combobox"
            value={query}
            placeholder="Search articles, series, sections…"
            aria-label="Search articles"
            aria-autocomplete="list"
            aria-expanded={searching}
            aria-controls={searching ? listId : undefined}
            aria-activedescendant={activeId}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
          />
          <kbd className="mono">Esc</kbd>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {resultLabel}
        </p>

        {searching && (
          <ul id={listId} className="palette-results" role="listbox" aria-label="Search results">
            {hits.map((hit, index) => (
              <li key={hit.article.key} role="presentation">
                <button
                  type="button"
                  id={`search-palette-opt-${index}`}
                  role="option"
                  aria-selected={index === active}
                  tabIndex={-1}
                  className={`palette-hit${index === active ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(index)}
                >
                  <span className="mono palette-hit-num">{pad2(hit.article.part)}</span>
                  <span className="palette-hit-text">
                    <span className="palette-hit-title">{hit.article.title}</span>
                    <span className="palette-hit-sub">{hit.heading ? `§ ${hit.heading}` : hit.article.dek}</span>
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
