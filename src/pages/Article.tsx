import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
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
  const active = useActiveHeading(meta.headings);
  const [railOpen, setRailOpen] = useState(false);

  usePageMeta({
    title: `${meta.title} — ${series?.title ?? "Shogol"}`,
    description: meta.dek,
    path: articlePath(meta),
  });

  return (
    <div className="wiki">
      <SiteHeader fullBleed />

      <div className="wiki-frame">
        <aside className={`wiki-rail${railOpen ? " is-open" : ""}`} aria-label="Series contents">
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

        {railOpen && <div className="rail-scrim" onClick={() => setRailOpen(false)} role="presentation" />}

        <main className="wiki-main" id="content">
          <div className="wiki-col">
            <div className="art-crumbs mono">
              <Link to="/">Index</Link>
              <span aria-hidden="true">/</span>
              <Link to={seriesPath(meta.series)}>{series?.title}</Link>
              <span aria-hidden="true">/</span>
              <span>Part {pad2(meta.part)}</span>
              <button className="rail-toggle" onClick={() => setRailOpen(true)}>
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
