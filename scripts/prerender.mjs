/* Turns every route into a static page.
 *
 * A client-rendered blog is an empty <div> to anything that doesn't run JS, so
 * every route is rendered to HTML at build time with the real title, meta
 * description, canonical link, and social tags. The client bundle then
 * hydrates it. The build prints how many pages it wrote — that number is not
 * hardcoded here.
 *
 * Replacements go through functions. A string replacement treats `$` as a
 * pattern (`$$` is one `$`), which eats sequences in article HTML.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

const { render, routes } = await import(resolve(root, "dist-ssr/entry-server.js"));
const template = readFileSync(resolve(dist, "index.html"), "utf8");
const index = JSON.parse(readFileSync(resolve(root, "src/content/generated/index.json"), "utf8"));

const SITE = "https://shogol.me";

const escape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One match, or the build fails. The replacer's return value is literal. */
function replaceOnce(source, pattern, replacer) {
  let matched = 0;
  const next = source.replace(pattern, (...args) => {
    matched += 1;
    return replacer(...args);
  });
  if (matched !== 1) {
    const label = pattern instanceof RegExp ? pattern.source : pattern;
    throw new Error(`prerender: expected 1 match for ${label}, found ${matched}`);
  }
  return next;
}

const pages = [];
for (const route of routes) {
  const rendered = await render(route.url);
  const { html, meta, head } = rendered;

  if (meta.noindex && head.includes('rel="canonical"')) {
    throw new Error(`prerender: ${route.url} is noindex but still has a canonical`);
  }
  if (!meta.noindex && !head.includes('rel="canonical"')) {
    throw new Error(`prerender: ${route.url} is missing a canonical link`);
  }

  const page = replaceOnce(
    replaceOnce(
      replaceOnce(template, /<title>[\s\S]*?<\/title>/, () => `<title>${escape(meta.title)}</title>`),
      /<meta\s+name="description"[\s\S]*?\/>/,
      () => `<meta name="description" content="${escape(meta.description)}" />`,
    ),
    "</head>",
    () => `  ${head}\n  </head>`,
  );
  const withBody = replaceOnce(page, '<div id="root"></div>', () => `<div id="root">${html}</div>`);

  const out = resolve(dist, route.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, withBody);
  pages.push({ route, meta, html });
}

writeFileSync(resolve(dist, "sitemap.xml"), sitemap(index));
writeFileSync(resolve(dist, "robots.txt"), robots());
writeFileSync(resolve(dist, "rss.xml"), rss(index));
writeFileSync(resolve(dist, "atom.xml"), atom(index));

rmSync(resolve(root, "dist-ssr"), { recursive: true, force: true });
console.log(`prerender: ${pages.length} pages`);

function loc(path) {
  return path === "/" ? `${SITE}/` : `${SITE}${path}`;
}

function sitemap(data) {
  const urls = [
    { path: "/", lastmod: data.articles[0]?.date },
    { path: "/series", lastmod: data.articles[0]?.date },
    ...data.series.map((series) => {
      const parts = data.articles.filter((article) => article.series === series.slug);
      const lastmod = parts.map((article) => article.date).sort().at(-1);
      return { path: `/series/${series.slug}`, lastmod };
    }),
    ...data.articles.map((article) => ({
      path: `/posts/${article.series}/${article.file}`,
      lastmod: article.date,
    })),
  ];
  const body = urls
    .map((url) => {
      const lastmod = url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : "";
      return `  <url>\n    <loc>${loc(url.path)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function robots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
}

function rss(data) {
  const items = data.articles
    .map((article) => {
      const url = loc(`/posts/${article.series}/${article.file}`);
      return `    <item>
      <title>${escape(article.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(article.date)}</pubDate>
      <description>${escape(article.dek)}</description>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Shogol</title>
    <link>${SITE}/</link>
    <description>${escape("Long-form series on AI, Go, and philosophy by Boris Shogol.")}</description>
    <language>en</language>
    <lastBuildDate>${rfc822(data.articles[0]?.date)}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

function atom(data) {
  const entries = data.articles
    .map((article) => {
      const url = loc(`/posts/${article.series}/${article.file}`);
      const when = `${article.date}T00:00:00Z`;
      return `  <entry>
    <title>${escape(article.title)}</title>
    <link href="${url}" />
    <id>${url}</id>
    <published>${when}</published>
    <updated>${when}</updated>
    <summary>${escape(article.dek)}</summary>
  </entry>`;
    })
    .join("\n");
  const updated = data.articles[0] ? `${data.articles[0].date}T00:00:00Z` : new Date().toISOString();
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Shogol</title>
  <subtitle>${escape("Long-form series on AI, Go, and philosophy by Boris Shogol.")}</subtitle>
  <link href="${SITE}/" />
  <link rel="self" href="${SITE}/atom.xml" />
  <updated>${updated}</updated>
  <id>${SITE}/</id>
  <author><name>Boris Shogol</name></author>
${entries}
</feed>
`;
}

function rfc822(iso) {
  if (!iso) return new Date().toUTCString();
  return new Date(`${iso}T00:00:00Z`).toUTCString();
}
