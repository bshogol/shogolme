/* Post-build check. Fails the build when a prerendered page is missing, two
 * pages share a title, a page has the wrong number of canonical links, or a
 * `$` run from an article body was eaten by a string replacement.
 *
 * Counts are read from the generated index and from dist/, not hardcoded.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const index = JSON.parse(readFileSync(resolve(root, "src/content/generated/index.json"), "utf8"));

const SITE = "https://shogol.me";
const failures = [];

const files = [
  { file: "index.html", canonical: `${SITE}/` },
  { file: "series.html", canonical: `${SITE}/series` },
  ...index.series.map((series) => ({
    file: `series/${series.slug}.html`,
    canonical: `${SITE}/series/${series.slug}`,
  })),
  ...index.articles.map((article) => ({
    file: `posts/${article.series}/${article.file}.html`,
    canonical: `${SITE}/posts/${article.series}/${article.file}`,
    article,
  })),
  { file: "404.html", canonical: null },
];

const titles = new Map();

for (const entry of files) {
  const path = resolve(dist, entry.file);
  if (!existsSync(path)) {
    failures.push(`missing ${entry.file}`);
    continue;
  }
  const page = readFileSync(path, "utf8");
  const title = page.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
  if (!title) failures.push(`${entry.file}: no title`);
  else if (titles.has(title)) failures.push(`duplicate title "${title}" in ${titles.get(title)} and ${entry.file}`);
  else titles.set(title, entry.file);

  const canonicals = [...page.matchAll(/<link\b[^>]*\brel="canonical"[^>]*>/g)];
  if (entry.canonical === null) {
    if (canonicals.length !== 0) failures.push(`${entry.file}: expected no canonical, found ${canonicals.length}`);
    if (!/name="robots"[^>]*content="noindex"|content="noindex"[^>]*name="robots"/.test(page)) {
      failures.push(`${entry.file}: expected noindex`);
    }
  } else if (canonicals.length !== 1) {
    failures.push(`${entry.file}: expected 1 canonical, found ${canonicals.length}`);
  } else {
    const href = canonicals[0][0].match(/\bhref="([^"]*)"/)?.[1];
    if (href !== entry.canonical) failures.push(`${entry.file}: canonical ${href} !== ${entry.canonical}`);
  }

  if (!entry.article) continue;
  const generated = JSON.parse(
    readFileSync(resolve(root, "src/content/generated/articles", `${entry.article.series}__${entry.article.file}.json`), "utf8"),
  );
  const runs = new Set(generated.html.match(/\$+/g) ?? []);
  for (const run of runs) {
    if (!page.includes(run)) failures.push(`${entry.file}: lost dollar run ${run}`);
  }
}

for (const name of ["sitemap.xml", "robots.txt", "rss.xml", "atom.xml"]) {
  if (!existsSync(resolve(dist, name))) failures.push(`missing ${name}`);
}

const robots = existsSync(resolve(dist, "robots.txt")) ? readFileSync(resolve(dist, "robots.txt"), "utf8") : "";
if (robots && !robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) failures.push("robots.txt is missing the sitemap URL");

if (failures.length) {
  console.error(`check: ${failures.length} problem${failures.length === 1 ? "" : "s"}`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `check: ${files.length} pages · ${index.articles.length} articles · unique titles · canonicals ok · dollar signs kept`,
);
