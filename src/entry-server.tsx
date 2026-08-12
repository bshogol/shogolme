import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { App } from "./App";
import { loadArticle, seedArticle } from "./lib/content";
import { canonical, takeCapturedMeta } from "./lib/meta";
import type { PageMeta } from "./lib/meta";

export type Rendered = { html: string; meta: PageMeta; canonical: string };

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
    title: "Shogol — Field notes on software",
    description: "Long-form series on how things actually work.",
    path: url,
  };

  return { html, meta, canonical: canonical(meta.path ?? url) };
}

export { routes } from "./lib/routes";
