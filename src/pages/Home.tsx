import { useMemo, useState } from "react";
import { Link } from "react-router";
import { SearchIcon, SiteHeader } from "../components/SiteHeader";
import { SeriesDirectory } from "../components/SeriesDirectory";
import { SiteFooter } from "../components/SiteFooter";
import { articlePath, articles, formatDate, pad2, series, totals } from "../lib/content";
import { search } from "../lib/search";
import { usePageMeta } from "../lib/meta";

export function Home() {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => search(query, 10), [query]);
  const recent = articles.slice(0, 3);

  usePageMeta({
    title: "Shogol — Thoughts, notes, interests",
    description: "Thoughts, notes, and interests — long-form series on how things actually work.",
    path: "/",
  });

  return (
    <>
      <SiteHeader />
      <main className="home" id="content">
        <section className="hero">
          <h1 className="hero-title hero-title--stack">
            <span>Thoughts</span>
            <span>Notes</span>
            <span>Interests</span>
          </h1>

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
    </>
  );
}
