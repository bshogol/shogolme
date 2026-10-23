import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ArticleBody } from "../components/ArticleBody";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import {
  articlePath,
  articlesByKey,
  formatDate,
  getArticle,
  loadArticle,
  neighbours,
  pad2,
  partsOf,
  relatedInOtherSeries,
  seriesBySlug,
  seriesPath,
} from "../lib/content";
import type { Article as ArticleData, ArticleMeta, Heading } from "../lib/content";
import { usePageMeta } from "../lib/meta";
import { useActiveHeading } from "../lib/useActiveHeading";
import { NotFound } from "./NotFound";

export function Article() {
  const params = useParams();
  const key = `${params.series}/${params.file}`;
  const meta = articlesByKey.get(key);
  const [body, setBody] = useState<ArticleData | undefined>(() => getArticle(key));

  useEffect(() => {
    const cached = getArticle(key);
    setBody(cached);
    if (cached) return;
    let live = true;
    loadArticle(key).then((article) => {
      if (live) setBody(article);
    });
    return () => {
      live = false;
    };
  }, [key]);

  if (!meta) return <NotFound />;
  return <ArticleView meta={meta} body={body} />;
}

function ArticleView({ meta, body }: { meta: ArticleMeta; body?: ArticleData }) {
  const series = seriesBySlug(meta.series);
  const parts = partsOf(meta.series);
  const { prev, next } = neighbours(meta);
  const active = useActiveHeading(meta.headings, Boolean(body));
  const related = relatedInOtherSeries(meta);
  const [railOpen, setRailOpen] = useState(false);
  const drawer = useMatchMedia("(max-width: 960px)");
  const railRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const outlineRef = useRef<HTMLDetailsElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const { hash } = useLocation();

  usePageMeta({
    title: `${meta.title} — ${series?.title ?? "Shogol"}`,
    headline: meta.title,
    description: meta.dek,
    path: articlePath(meta),
    type: "article",
    published: meta.date,
  });

  useEffect(() => {
    if (!railOpen) return;
    railRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setRailOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [railOpen]);

  // The heading is not in the document until the article chunk arrives.
  useEffect(() => {
    if (!body || !hash) return;
    const id = decodeHash(hash);
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView();
    });
    return () => cancelAnimationFrame(frame);
  }, [body, hash]);

  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const column = document.querySelector<HTMLElement>(".wiki-col");
      if (!column) return;
      const start = column.getBoundingClientRect().top + window.scrollY;
      const total = column.offsetHeight - window.innerHeight * 0.45;
      const seen = window.scrollY + window.innerHeight * 0.12 - start;
      const progress = total > 0 ? Math.min(1, Math.max(0, seen / total)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [body]);

  useEffect(() => {
    if (!next) return;
    const node = document.querySelector(".art-pn");
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        void loadArticle(next.key);
        observer.disconnect();
      },
      { rootMargin: "280px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [next]);

  const closeRail = () => {
    setRailOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <div className="wiki">
      <div className="read-progress" ref={progressRef} aria-hidden="true" />
      <SiteHeader fullBleed />

      <div className="wiki-frame">
        <aside
          id="series-rail"
          ref={railRef}
          tabIndex={-1}
          className={`wiki-rail${railOpen ? " is-open" : ""}`}
          aria-label="Series contents"
          inert={drawer && !railOpen ? true : undefined}
        >
          <div className="rail-in">
            <Link className="rail-series" to={seriesPath(meta.series)}>
              <span className="mono rail-tag">{series?.tag}</span>
              <span className="rail-series-title">{series?.title}</span>
              <span className="mono rail-count">{parts.length} parts</span>
            </Link>
            <nav className="rail-list">
              {parts.map((part) => (
                <Link
                  key={part.key}
                  to={articlePath(part)}
                  className={`rail-row${part.key === meta.key ? " is-current" : ""}`}
                  aria-current={part.key === meta.key ? "page" : undefined}
                  onClick={() => setRailOpen(false)}
                >
                  <span className="mono rail-num">{pad2(part.part)}</span>
                  <span className="rail-row-title">{part.title}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {railOpen && <div className="rail-scrim" onClick={closeRail} role="presentation" />}

        <main className="wiki-main" id="content">
          <div className="wiki-col">
            <div className="art-crumbs mono">
              <Link to="/">Index</Link>
              <span aria-hidden="true">/</span>
              <Link to={seriesPath(meta.series)}>{series?.title}</Link>
              <span aria-hidden="true">/</span>
              <span>Part {pad2(meta.part)}</span>
              <button
                ref={toggleRef}
                type="button"
                className="rail-toggle"
                aria-expanded={railOpen}
                aria-controls="series-rail"
                onClick={() => setRailOpen((open) => !open)}
              >
                Contents
              </button>
            </div>

            <header className="art-head">
              <h1>{meta.title}</h1>
              <p className="art-lede">{meta.dek}</p>
              <div className="art-meta mono">
                <span>{formatDate(meta.date)}</span>
                <span aria-hidden="true">·</span>
                <span>{meta.readMinutes} min read</span>
                <span aria-hidden="true">·</span>
                <span>{meta.category}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Part {pad2(meta.part)} of {pad2(parts.length)}
                </span>
              </div>
            </header>

            <details className="page-outline" ref={outlineRef}>
              <summary className="mono">On this page</summary>
              <nav aria-label="On this page">
                {meta.headings.map((heading: Heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`outline-row lvl-${heading.level}${heading.id === active ? " is-active" : ""}`}
                    onClick={() => {
                      if (outlineRef.current) outlineRef.current.open = false;
                    }}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </details>

            {body ? <ArticleBody html={body.html} /> : <ArticleSkeleton />}

            <nav className="art-pn" aria-label="Series navigation">
              {prev ? (
                <Link to={articlePath(prev)} className="pn-card">
                  <span className="mono pn-k">← Part {pad2(prev.part)}</span>
                  <span className="pn-title">{prev.title}</span>
                </Link>
              ) : (
                <span className="pn-card pn-card--empty" aria-hidden="true" />
              )}
              {next ? (
                <Link to={articlePath(next)} className="pn-card pn-card--next">
                  <span className="mono pn-k">Part {pad2(next.part)} →</span>
                  <span className="pn-title">{next.title}</span>
                </Link>
              ) : (
                <Link to={seriesPath(meta.series)} className="pn-card pn-card--next">
                  <span className="mono pn-k">End of series</span>
                  <span className="pn-title">Back to {series?.title}</span>
                </Link>
              )}
            </nav>

            {related.length > 0 && (
              <section className="art-related" aria-labelledby="related-heading">
                <p className="mono art-related-head" id="related-heading">
                  Related in other series
                </p>
                <div className="art-related-grid">
                  {related.map((item) => (
                    <Link key={item.key} to={articlePath(item)} className="pn-card">
                      <span className="mono pn-k">{item.seriesTitle}</span>
                      <span className="pn-title">{item.title}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <SiteFooter />
        </main>

        <aside className="wiki-outline" aria-label="On this page">
          <div className="outline-in">
            <p className="mono outline-head">On this page</p>
            <nav>
              {meta.headings.map((heading: Heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`outline-row lvl-${heading.level}${heading.id === active ? " is-active" : ""}`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ArticleSkeleton() {
  return (
    <div className="prose" aria-busy="true">
      {[92, 78, 86, 40].map((width, index) => (
        <div key={index} className="skeleton" style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}

function useMatchMedia(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function decodeHash(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
