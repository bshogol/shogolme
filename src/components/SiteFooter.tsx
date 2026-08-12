import { Link } from "react-router";
import { formatDate, series, totals } from "../lib/content";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="foot-in">
        <div className="foot-brand">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <div>
            <p className="foot-name">shogol</p>
            <p className="foot-tag">Field notes on software — written in the open.</p>
          </div>
        </div>

        <nav className="foot-links" aria-label="Series">
          <p className="mono foot-head">Series</p>
          {series.map((s) => (
            <Link key={s.slug} to={`/series/${s.slug}`}>
              {s.title}
            </Link>
          ))}
        </nav>

        <nav className="foot-links" aria-label="Elsewhere">
          <p className="mono foot-head">Elsewhere</p>
          <a href="https://github.com/bshogol" target="_blank" rel="noopener">
            GitHub
          </a>
          <Link to="/">Full index</Link>
        </nav>
      </div>

      <div className="foot-rule mono">
        <span>© {new Date().getFullYear()} Shogol</span>
        <span>
          {totals.articles} articles · {totals.series} series
        </span>
        <span>Last updated {formatDate(totals.updated)}</span>
      </div>
    </footer>
  );
}
