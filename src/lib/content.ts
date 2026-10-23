import index from "../content/generated/index.json";

export type Heading = { id: string; text: string; level: number };

export type ArticleMeta = {
  key: string;
  series: string;
  seriesTitle: string;
  part: number;
  date: string;
  category: string;
  title: string;
  dek: string;
  file: string;
  headings: Heading[];
  words: number;
  readMinutes: number;
  haystack: string;
};

export type Article = ArticleMeta & { html: string };

export type Series = {
  slug: string;
  order: number;
  title: string;
  tag: string;
  blurb: string;
};

export const series: Series[] = index.series;

/** Newest first — the shape the home page and the "latest" rail want. */
export const articles: ArticleMeta[] = index.articles;

export const articlesByKey = new Map(articles.map((a) => [a.key, a]));

export function seriesBySlug(slug: string): Series | undefined {
  return series.find((s) => s.slug === slug);
}

/** Parts of one series in reading order. */
export function partsOf(slug: string): ArticleMeta[] {
  return articles.filter((a) => a.series === slug).sort((a, b) => a.part - b.part);
}

export function neighbours(article: ArticleMeta) {
  const parts = partsOf(article.series);
  const i = parts.findIndex((p) => p.key === article.key);
  return { prev: i > 0 ? parts[i - 1] : undefined, next: i >= 0 ? parts[i + 1] : undefined };
}

export const totals = {
  articles: articles.length,
  series: series.length,
  words: articles.reduce((sum, a) => sum + a.words, 0),
  updated: articles[0]?.date ?? "",
};

const RELATED_STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "from", "by", "is", "are",
  "was", "were", "be", "as", "at", "it", "its", "this", "that", "these", "those", "over",
  "than", "then", "what", "when", "how", "why", "who", "which", "your", "you", "we", "our", "their",
  "them", "they", "not", "but", "about", "after", "before", "between", "within", "without", "across",
  "using", "use", "used", "via", "into", "just", "only", "also", "more", "some", "such",
]);

function relatedWords(value: string): string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 3 && !RELATED_STOP.has(word)),
    ),
  ];
}

/** One article from each other series, preferring shared words in the title, dek, and category. */
export function relatedInOtherSeries(article: ArticleMeta, limit = 2): ArticleMeta[] {
  const words = relatedWords(`${article.title} ${article.dek} ${article.category}`);
  const ranked = articles
    .filter((other) => other.series !== article.series)
    .map((other) => {
      const hay = `${other.title} ${other.dek} ${other.category}`.toLowerCase();
      let score = 0;
      for (const word of words) if (hay.includes(word)) score += 1;
      return { other, score };
    })
    .sort((a, b) => b.score - a.score || (a.other.date < b.other.date ? 1 : -1));

  const picked: ArticleMeta[] = [];
  const seen = new Set<string>();
  for (const row of ranked) {
    if (seen.has(row.other.series)) continue;
    seen.add(row.other.series);
    picked.push(row.other);
    if (picked.length >= limit) break;
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Article bodies are one lazily-imported chunk each, so visiting the home page
// never downloads every article of HTML. Loaded bodies are cached for the session
// and the prerenderer seeds the cache before rendering.

const loaders = import.meta.glob<{ default: Article }>("../content/generated/articles/*.json");
const cache = new Map<string, Article>();

const chunkPath = (key: string) => `../content/generated/articles/${key.replace("/", "__")}.json`;

export function getArticle(key: string): Article | undefined {
  return cache.get(key);
}

export function seedArticle(article: Article): void {
  cache.set(article.key, article);
}

export async function loadArticle(key: string): Promise<Article | undefined> {
  const cached = cache.get(key);
  if (cached) return cached;
  const load = loaders[chunkPath(key)];
  if (!load) return undefined;
  const article = (await load()).default;
  cache.set(key, article);
  return article;
}

// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-01-08" -> "Jan 8, 2026". Parsed by hand: `new Date(iso)` is UTC and
 *  renders as the previous day for anyone west of Greenwich. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

export function formatMonth(iso: string): string {
  const [year, month] = iso.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** "Jan 2026 – May 2026", or one month when the series was published inside it. */
export function dateRange(dates: string[]): string {
  if (!dates.length) return "";
  const sorted = [...dates].sort();
  const start = formatMonth(sorted[0]);
  const end = formatMonth(sorted[sorted.length - 1]);
  return start === end ? start : `${start} – ${end}`;
}

export function articlePath(a: { series: string; file: string }): string {
  return `/posts/${a.series}/${a.file}`;
}

export function seriesPath(slug: string): string {
  return `/series/${slug}`;
}

export const pad2 = (n: number): string => String(n).padStart(2, "0");
