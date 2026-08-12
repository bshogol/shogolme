import { Link } from "react-router";
import { articlePath, pad2, partsOf, seriesPath } from "../lib/content";
import type { Series } from "../lib/content";

/** A numbered directory of series — the wiki's table of contents.
 *
 * `preview` caps how many parts each entry lists, which is what keeps the home
 * page a fixed size as series accumulate. Omit it (the /series page) to list
 * every part. */
export function SeriesDirectory({ series, preview }: { series: Series[]; preview?: number }) {
  return (
    <div className="directory">
      {series.map((s) => {
        const parts = partsOf(s.slug);
        const shown = preview ? parts.slice(0, preview) : parts;
        const hidden = parts.length - shown.length;

        return (
          <section className="dir-row" key={s.slug}>
            <p className="mono dir-num" aria-hidden="true">
              {pad2(s.order)}
            </p>

            <div className="dir-body">
              <div className="dir-head">
                <h3 className="dir-title">
                  <Link to={seriesPath(s.slug)}>{s.title}</Link>
                </h3>
                <span className="mono tag">{s.tag}</span>
                <span className="mono dir-count">{parts.length} parts</span>
              </div>

              <p className="dir-blurb">{s.blurb}</p>

              <ol className="dir-parts">
                {shown.map((part) => (
                  <li key={part.key}>
                    <Link to={articlePath(part)}>
                      <span className="mono dir-part-num">{pad2(part.part)}</span>
                      <span className="dir-part-title">{part.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>

              <Link className="mono dir-more" to={seriesPath(s.slug)}>
                {hidden > 0 ? `${hidden} more part${hidden > 1 ? "s" : ""} →` : "Open the series →"}
              </Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}
