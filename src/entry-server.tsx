import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { App } from "./App";
import { loadArticle, seedArticle } from "./lib/content";
import { DEFAULT_TITLE, SITE_DESCRIPTION, renderExtraHead, takeCapturedMeta } from "./lib/meta";
import type { PageMeta } from "./lib/meta";

export type Rendered = { html: string; meta: PageMeta; head: string };

/** One route in, one static page out. Article bodies are seeded into the cache
 *  first so the render is synchronous and complete. */
export async function render(url: string): Promise<Rendered> {
  const match = url.match(/^\/posts\/([^/]+)\/([^/]+)$/);
  if (match) {
    const article = await loadArticle(`${match[1]}/${match[2]}`);
    if (article) seedArticle(article);
  }

  const html = renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );

  const meta = takeCapturedMeta() ?? {
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    path: url,
  };
  if (!meta.path && !meta.noindex) meta.path = url;

  return { html, meta, head: renderExtraHead(meta) };
}

export { routes } from "./lib/routes";
