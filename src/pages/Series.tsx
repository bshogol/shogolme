import { Link, useParams } from "react-router";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { articlePath, formatDate, pad2, partsOf, seriesBySlug, seriesPath } from "../lib/content";
import { usePageMeta } from "../lib/meta";
import { NotFound } from "./NotFound";

export function Series() {
  const { slug = "" } = useParams();
  const series = seriesBySlug(slug);
  const parts = partsOf(slug);

  usePageMeta({
    title: series ? `${series.title} — Shogol` : "Series not found — Shogol",
    description: series?.blurb ?? "",
    path: seriesPath(slug),
  });

  if (!series) return <NotFound />;

  const minutes = parts.reduce((sum, part) => sum + part.readMinutes, 0);
  const categories = [...new Set(parts.map((part) => part.category))];

  return (
    <>
      <SiteHeader />
      <main className="home" id="content">
        <section className="hero hero--series">
          <p className="eyebrow mono">
            <span className="eyebrow-dot" aria-hidden="true" />
            Series · {series.tag}
          </p>
          <h1 className="hero-title hero-title--sm">{series.title}</h1>
          <p className="hero-lede">{series.blurb}</p>
          <ul className="hero-stats mono">
            <li>
              <b>{parts.length}</b> parts
            </li>
            <li>
              <b>{minutes}</b> min end to end
            </li>
            <li>{categories.length} sections</li>
            <li>Latest {formatDate(parts[parts.length - 1]?.date ?? "")}</li>
          </ul>
        </section>

        <section className="index">
          <h2 className="section-head mono">Contents</h2>
          <ol className="portal-list portal-list--full">
            {parts.map((part) => (
              <li key={part.key}>
                <Link to={articlePath(part)}>
                  <span className="mono portal-num">{pad2(part.part)}</span>
                  <span className="portal-row-title">{part.title}</span>
                  <span className="portal-row-dek">{part.dek}</span>
                  <span className="mono portal-row-cat">
                    {part.category} · {part.readMinutes} min
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
