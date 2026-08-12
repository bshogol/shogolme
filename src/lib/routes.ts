import { articlePath, articles, series, seriesPath } from "./content";

/** Every URL the prerenderer turns into a static file. `out` is relative to
 *  dist/ — Vercel's cleanUrls serves foo.html at /foo. */
export const routes: { url: string; out: string }[] = [
  { url: "/", out: "index.html" },
  { url: "/series", out: "series.html" },
  ...series.map((s) => ({ url: seriesPath(s.slug), out: `series/${s.slug}.html` })),
  ...articles.map((a) => ({ url: articlePath(a), out: `posts/${a.series}/${a.file}.html` })),
  { url: "/404", out: "404.html" },
];
