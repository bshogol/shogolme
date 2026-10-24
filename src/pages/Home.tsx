import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { SearchIcon, SiteHeader } from "../components/SiteHeader";
import { SeriesDirectory } from "../components/SeriesDirectory";
import { SiteFooter } from "../components/SiteFooter";
import { onComboKeyDown } from "../lib/combo";
import { articlePath, articles, formatDate, pad2, series, totals } from "../lib/content";
import { DEFAULT_TITLE, SITE_DESCRIPTION, usePageMeta } from "../lib/meta";
import { search } from "../lib/search";

const HeroField = lazy(() => import("../components/HeroField"));

export function Home() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const hits = useMemo(() => search(query, 10), [query]);
  const newest = articles[0];
  const live = useHeroMotion();
  const dark = useDark();
  const searching = query.trim().length > 0;
  const listId = "home-search-list";
  const activeId = searching && hits[active] ? `home-search-opt-${active}` : undefined;

  usePageMeta({
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
  });

  return (
    <div className="home-shell">
      <div className="hero-bg" aria-hidden="true">
        {live && (
          <Suspense fallback={null}>
            <HeroField dark={dark} />
          </Suspense>
        )}
      </div>
      <SiteHeader />
      <main className="home" id="content">
        <section className="hero">
          <p className="eyebrow mono">
            <span className="eyebrow-dot" aria-hidden="true" />
            shogol.me
          </p>
          <h1 className="hero-title hero-title--plain">Long-form series on AI, Go, and philosophy.</h1>

          <div className="hero-search">
            <SearchIcon />
            <input
              role="combobox"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) =>
                onComboKeyDown(
                  event,
                  active,
                  hits.length,
                  setActive,
                  (index) => {
                    const hit = hits[index];
                    if (hit) {
                      // Navigation is the link itself when clicked. Enter follows the active option.
                      const node = document.getElementById(`home-search-opt-${index}`);
                      if (node instanceof HTMLAnchorElement) node.click();
                    }
                  },
                  () => {
                    if (query) setQuery("");
                    else (event.target as HTMLInputElement).blur();
                  },
                )
              }
              placeholder={`Search ${totals.articles} articles…`}
              aria-label="Search articles"
              aria-autocomplete="list"
              aria-expanded={searching}
              aria-controls={searching ? listId : undefined}
              aria-activedescendant={activeId}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button className="hero-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                ✕
              </button>
            )}
          </div>

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {searching ? `${hits.length} ${hits.length === 1 ? "result" : "results"}` : ""}
          </p>

          {searching ? (
            <div id={listId} className="hero-results" role="listbox" aria-label="Search results">
              {hits.length ? (
                hits.map((hit, index) => (
                  <Link
                    key={hit.article.key}
                    id={`home-search-opt-${index}`}
                    to={articlePath(hit.article)}
                    role="option"
                    aria-selected={index === active}
                    className={`hit${index === active ? " is-active" : ""}`}
                    onMouseEnter={() => setActive(index)}
                  >
                    <span className="mono hit-num">{pad2(hit.article.part)}</span>
                    <span className="hit-text">
                      <span className="hit-title">{hit.article.title}</span>
                      <span className="hit-sub">{hit.heading ? `§ ${hit.heading}` : hit.article.dek}</span>
                    </span>
                    <span className="mono hit-series">{hit.article.seriesTitle}</span>
                  </Link>
                ))
              ) : (
                <p className="hit-empty">No article matches “{query}”.</p>
              )}
            </div>
          ) : (
            <ul className="hero-stats mono">
              <li>
                <b>{totals.articles}</b> articles
              </li>
              <li>
                <b>{totals.series}</b> series
              </li>
              <li>
                <b>{totals.words.toLocaleString()}</b> words
              </li>
              <li>Updated {formatDate(totals.updated)}</li>
            </ul>
          )}
        </section>

        <section className="reading" aria-label="Reading">
          {newest && (
            <Link to={articlePath(newest)} className="continue-link">
              <span className="mono continue-kicker">Continue</span>
              <span className="continue-body">
                <span className="continue-title">{newest.title}</span>
                <span className="mono continue-meta">
                  {newest.seriesTitle} · Part {pad2(newest.part)} · {newest.readMinutes} min
                </span>
              </span>
            </Link>
          )}

          <div className="section-bar">
            <h2 className="section-head mono">Series</h2>
            <Link className="mono section-link" to="/series">
              All series
            </Link>
          </div>
          {/* Capped at six parts each: the home page stays scannable as series grow. */}
          <SeriesDirectory series={series} preview={6} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Decorative WebGL after idle. Reduced motion, save-data, and the server
 *  snapshot stay on the static wash so prerender and constrained clients
 *  never start a canvas. */
function useHeroMotion(): boolean {
  const reduceMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => true);
  const saveData = useSyncExternalStore(subscribeConnection, prefersSaveData, () => false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduceMotion || saveData) return;
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => win.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 1);
    return () => window.clearTimeout(id);
  }, [reduceMotion, saveData]);

  return !reduceMotion && !saveData && ready;
}

function useDark(): boolean {
  return useSyncExternalStore(subscribeTheme, readDark, () => false);
}

function subscribeTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function subscribeMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeConnection(onStoreChange: () => void) {
  const connection = navigatorConnection();
  connection?.addEventListener?.("change", onStoreChange);
  return () => connection?.removeEventListener?.("change", onStoreChange);
}

function prefersSaveData() {
  return Boolean(navigatorConnection()?.saveData);
}

type NetworkInformation = {
  saveData?: boolean;
  addEventListener?: (type: string, callback: () => void) => void;
  removeEventListener?: (type: string, callback: () => void) => void;
};

function navigatorConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}
