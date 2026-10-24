import { Link } from "react-router";
import { formatDate, series, totals } from "../lib/content";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="foot-in">
        <div className="foot-brand">
          <p className="foot-name">shogol</p>
          <p className="foot-tag">Long-form series on AI, Go, and philosophy.</p>
        </div>

        <nav className="foot-links" aria-label="Series">
          <p className="mono foot-head">Series</p>
          {series.map((s) => (
            <Link key={s.slug} to={`/series/${s.slug}`}>
              {s.title}
            </Link>
          ))}
        </nav>

        <nav className="foot-links" aria-label="Site">
          <p className="mono foot-head">Site</p>
          <Link to="/">Full index</Link>
          <Link to="/series">All series</Link>
        </nav>
      </div>

      <div className="foot-rule mono">
        <span>© {new Date().getFullYear()} Boris Shogol</span>
        <span>
          {totals.articles} articles · {totals.series} series
        </span>
        <span>Last updated {formatDate(totals.updated)}</span>
      </div>
    </footer>
  );
}
