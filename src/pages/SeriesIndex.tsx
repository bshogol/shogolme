import { SeriesDirectory } from "../components/SeriesDirectory";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { formatDate, series, totals } from "../lib/content";
import { usePageMeta } from "../lib/meta";

/** The whole wiki on one page: every series, every part. This is where the
 *  complete listing lives now that the home page only previews. */
export function SeriesIndex() {
  usePageMeta({
    title: "All series — Shogol",
    description: `Every series and every article on shogol.me — ${totals.articles} articles across ${totals.series} series.`,
    path: "/series",
  });

  return (
    <>
      <SiteHeader />
      <main className="home" id="content">
        <section className="hero hero--series">
          <p className="eyebrow mono">
            <span className="eyebrow-dot" aria-hidden="true" />
            The full map
          </p>
          <h1 className="hero-title hero-title--sm">All series.</h1>
          <p className="hero-lede">
            Every article on the site, grouped by the series it belongs to and in reading order. Each series stands
            alone; each article stands alone inside it.
          </p>
          <ul className="hero-stats mono">
            <li>
              <b>{totals.series}</b> series
            </li>
            <li>
              <b>{totals.articles}</b> articles
            </li>
            <li>
              <b>{totals.words.toLocaleString()}</b> words
            </li>
            <li>Updated {formatDate(totals.updated)}</li>
          </ul>
        </section>

        <section className="index">
          <div className="section-bar">
            <h2 className="section-head mono">Contents</h2>
          </div>
          <SeriesDirectory series={series} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
