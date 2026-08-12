import { useMemo, useState } from "react";
import { Link } from "react-router";
import { SearchIcon, SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { articlePath, articles, formatDate, pad2, partsOf, series, seriesPath, totals } from "../lib/content";
import { search } from "../lib/search";
import { usePageMeta } from "../lib/meta";

export function Home() {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => search(query, 10), [query]);
  const recent = articles.slice(0, 3);

  usePageMeta({
    title: "Shogol — Field notes on software",
    description:
      "A working wiki of long-form series on how things actually work — from large language models and the engines that serve them, to the Go patterns behind production code.",
    path: "/",
  });

  return (
    <>
      <SiteHeader />
      <main className="home" id="content">
        <section className="hero">
          <p className="eyebrow mono">
            <span className="eyebrow-dot" aria-hidden="true" />
            Written in the open
          </p>
          <h1 className="hero-title">Field notes on software.</h1>
          <p className="hero-lede">
            A working wiki of long-form series on how things actually work — from large language models and the
            engines that serve them, to the Go patterns behind production code. Start anywhere; every article stands
            on its own.
          </p>

          <div className="hero-search">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${totals.articles} articles…`}
              aria-label="Search articles"
              autoComplete="off"
            />
            {query && (
              <button className="hero-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                ✕
              </button>
            )}
          </div>

          {query ? (
            <div className="hero-results">
              {hits.length ? (
                hits.map((hit) => (
                  <Link key={hit.article.key} to={articlePath(hit.article)} className="hit">
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

        <section className="recent">
          <h2 className="section-head mono">Recently published</h2>
          <div className="recent-grid">
            {recent.map((article) => (
              <Link key={article.key} to={articlePath(article)} className="card">
                <span className="mono card-meta">
                  {article.seriesTitle} · Part {pad2(article.part)}
                </span>
                <h3 className="card-title">{article.title}</h3>
                <p className="card-dek">{article.dek}</p>
                <span className="mono card-foot">
                  {formatDate(article.date)} · {article.readMinutes} min
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="index">
          <h2 className="section-head mono">The index</h2>
          {series.map((s) => {
            const parts = partsOf(s.slug);
            return (
              <section className="portal" key={s.slug}>
                <header className="portal-head">
                  <div>
                    <h3 className="portal-title">
                      <Link to={seriesPath(s.slug)}>{s.title}</Link>
                      <span className="mono tag">{s.tag}</span>
                    </h3>
                    <p className="portal-blurb">{s.blurb}</p>
                  </div>
                  <Link className="portal-link mono" to={seriesPath(s.slug)}>
                    {parts.length} parts →
                  </Link>
                </header>
                <ol className="portal-list">
                  {parts.map((part) => (
                    <li key={part.key}>
                      <Link to={articlePath(part)}>
                        <span className="mono portal-num">{pad2(part.part)}</span>
                        <span className="portal-row-title">{part.title}</span>
                        <span className="portal-row-dek">{part.dek}</span>
                        <span className="mono portal-row-cat">{part.category}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
