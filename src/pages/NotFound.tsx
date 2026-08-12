import { Link } from "react-router";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { articlePath, articles, pad2 } from "../lib/content";
import { usePageMeta } from "../lib/meta";

export function NotFound() {
  usePageMeta({ title: "Not found — Shogol", description: "That page does not exist." });

  return (
    <>
      <SiteHeader />
      <main className="home" id="content">
        <section className="hero">
          <p className="eyebrow mono">
            <span className="eyebrow-dot" aria-hidden="true" />
            404
          </p>
          <h1 className="hero-title hero-title--sm">This page isn’t in the index.</h1>
          <p className="hero-lede">
            The article may have moved. The three most recent ones are below, or search from the header.
          </p>
        </section>
        <section className="index">
          <ol className="portal-list portal-list--full">
            {articles.slice(0, 3).map((article) => (
              <li key={article.key}>
                <Link to={articlePath(article)}>
                  <span className="mono portal-num">{pad2(article.part)}</span>
                  <span className="portal-row-title">{article.title}</span>
                  <span className="portal-row-dek">{article.dek}</span>
                  <span className="mono portal-row-cat">{article.seriesTitle}</span>
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
