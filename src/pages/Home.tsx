import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { SearchIcon, SiteHeader } from "../components/SiteHeader";
import { SeriesDirectory } from "../components/SeriesDirectory";
import { SiteFooter } from "../components/SiteFooter";
import { onComboKeyDown } from "../lib/combo";
import { articlePath, articles, formatDate, pad2, partsOf, series, totals } from "../lib/content";
import { DEFAULT_TITLE, SITE_DESCRIPTION, usePageMeta } from "../lib/meta";
import { search } from "../lib/search";

const PixelBlast = lazy(() => import("../components/PixelBlast"));

export function Home() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const hits = useMemo(() => search(query, 10), [query]);
  const newest = articles[0];
  const showEffect = useHeroEffect();
  const searching = query.trim().length > 0;
  const listId = "home-search-list";
  const activeId = searching && hits[active] ? `home-search-opt-${active}` : undefined;

  usePageMeta({
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
  });

  const color = useSyncExternalStore(subscribeDark, darkBlue, () => "#2563eb");

  return (
    <div className="home-shell">
      {showEffect && (
        <div className="hero-bg" aria-hidden="true">
          <Suspense fallback={null}>
            <PixelBlast
              variant="square"
              pixelSize={4}
              color={color}
              patternScale={2}
              patternDensity={1}
              enableRipples
              speed={0.5}
              edgeFade={0.35}
              transparent
              autoPauseOffscreen
            />
          </Suspense>
        </div>
      )}
      <SiteHeader />
      <main className="home" id="content">
        <section className="hero">
          <p className="eyebrow mono">
            <span className="eyebrow-dot" aria-hidden="true" />
            shogol.me
          </p>
          <h1 className="hero-title hero-title--plain">Long-form series on AI, Go, and philosophy by Boris Shogol.</h1>

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

        {newest && (
          <section className="continue">
            <h2 className="section-head mono">Continue reading</h2>
            <Link to={articlePath(newest)} className="continue-card">
              <span className="mono card-meta">
                {newest.seriesTitle} · Part {pad2(newest.part)}
              </span>
              <h3>{newest.title}</h3>
              <p className="continue-dek">{newest.dek}</p>
              <span className="mono card-foot">
                {formatDate(newest.date)} · {newest.readMinutes} min
              </span>
            </Link>
          </section>
        )}

        <section className="start-here">
          <h2 className="section-head mono">Start here</h2>
          <div className="start-grid">
            {series.map((item) => {
              const first = partsOf(item.slug)[0];
              if (!first) return null;
              return (
                <Link key={item.slug} to={articlePath(first)} className="card">
                  <span className="mono card-meta">
                    {item.tag} · {item.title}
                  </span>
                  <h3 className="card-title">{first.title}</h3>
                  <p className="card-dek">{item.blurb}</p>
                  <span className="mono card-foot">Part {pad2(first.part)} · Start here →</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="index">
          <div className="section-bar">
            <h2 className="section-head mono">The directory</h2>
            <Link className="mono section-link" to="/series">
              All series →
            </Link>
          </div>
          {/* Capped at six parts each: the home page has to stay one screen of
              scanning however many series accumulate. */}
          <SeriesDirectory series={series} preview={6} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Decorative WebGL: after idle, and only for a fine pointer on a wide viewport.
 *  Reduced motion stays off. The server snapshot is off so prerender stays static. */
function useHeroEffect(): boolean {
  const reduceMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => true);
  const capable = useSyncExternalStore(subscribeCapable, isCapable, () => false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduceMotion || !capable) return;
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => win.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 1);
    return () => window.clearTimeout(id);
  }, [reduceMotion, capable]);

  return !reduceMotion && capable && ready;
}

function subscribeCapable(onStoreChange: () => void) {
  const fine = window.matchMedia("(pointer: fine)");
  const wide = window.matchMedia("(min-width: 900px)");
  fine.addEventListener("change", onStoreChange);
  wide.addEventListener("change", onStoreChange);
  return () => {
    fine.removeEventListener("change", onStoreChange);
    wide.removeEventListener("change", onStoreChange);
  };
}

function isCapable() {
  return window.matchMedia("(pointer: fine)").matches && window.matchMedia("(min-width: 900px)").matches;
}

function subscribeDark(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function darkBlue() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "#3b82f6" : "#2563eb";
}

function subscribeMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
