import { articles } from "./content";
import type { ArticleMeta } from "./content";

export type SearchHit = { article: ArticleMeta; score: number; heading?: string };

/** Every term must appear somewhere in the article's haystack (title, dek,
 *  category, series, headings). Title matches outrank heading matches so
 *  "context" finds the Context article before the ten pages that mention it. */
export function search(query: string, limit = 8): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  const hits: SearchHit[] = [];
  for (const article of articles) {
    if (!terms.every((term) => article.haystack.includes(term))) continue;

    const title = article.title.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.startsWith(term)) score += 6;
      else if (title.includes(term)) score += 4;
      if (article.dek.toLowerCase().includes(term)) score += 2;
      if (article.category.toLowerCase().includes(term)) score += 1;
    }

    const heading = article.headings.find((h) => terms.every((term) => h.text.toLowerCase().includes(term)));
    if (heading) score += 2;

    hits.push({ article, score, heading: score <= 2 ? heading?.text : undefined });
  }

  return hits.sort((a, b) => b.score - a.score || (a.article.date < b.article.date ? 1 : -1)).slice(0, limit);
}
