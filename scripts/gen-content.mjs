/* Build-time content pipeline.
 *
 * The 26 article bodies live in /posts as hand-written HTML — that stays the
 * source of truth. This script lifts each `.prose` block out, gives every
 * heading a stable id, rewrites sibling links to app routes, highlights code
 * (in Node, so the prerendered HTML ships already coloured) and writes one
 * JSON per article plus a small search index the home page can afford to load.
 *
 * Output is generated, not committed: `npm run gen` runs before dev and build.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";
import hljs from "highlight.js/lib/core";
import go from "highlight.js/lib/languages/go";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "src/content/generated");
const articleDir = resolve(outDir, "articles");

for (const [name, lang] of Object.entries({ go, python, javascript, typescript, json, yaml, bash, sql })) {
  hljs.registerLanguage(name, lang);
}

/** Display names for the code-panel label strip. `Bash`, never `bash`. */
const LANG_LABEL = {
  go: "Go",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  json: "JSON",
  yaml: "YAML",
  bash: "Bash",
  sql: "SQL",
};

/** Series whose snippets are overwhelmingly one language — auto-detect on a
 *  four-line snippet is a coin flip, so bias it with a subset per series. */
const LANG_SUBSET = {
  "advanced-go-patterns": ["go", "bash", "json", "yaml"],
  "tokens-to-agents": ["python", "json", "bash", "javascript", "yaml", "go"],
};

const COPY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
  '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 012-2h8"/></svg>';

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

const escapeHtml = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function highlight(source, seriesSlug) {
  const subset = LANG_SUBSET[seriesSlug] ?? Object.keys(LANG_LABEL);
  const result = hljs.highlightAuto(source, subset);
  // A low auto-detect score means "no idea" — better an unlabelled plain panel
  // than a shell transcript confidently coloured as SQL.
  const confident = result.relevance >= 5 && result.language;
  return {
    html: confident ? result.value : escapeHtml(source),
    label: confident ? LANG_LABEL[result.language] ?? result.language : "Code",
  };
}

function buildArticle(post, series) {
  const path = resolve(root, "posts", post.series, `${post.file}.html`);
  // `pre` is a raw-text element by default, which hides the <code> child and
  // leaves its tags as literal text. It has to be absent from the map, not set
  // false — false means "block text element whose text is discarded".
  const doc = parse(readFileSync(path, "utf8"), {
    blockTextElements: { script: true, noscript: true, style: true },
  });

  const prose = doc.querySelector(".prose");
  if (!prose) throw new Error(`${post.file}: no .prose block found`);

  // ---- headings -> ids + outline ----------------------------------------
  const headings = [];
  const seen = new Map();
  for (const node of prose.querySelectorAll("h2, h3, h4")) {
    const text = node.structuredText.trim();
    let id = slugify(text);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count) id = `${id}-${count + 1}`;
    node.setAttribute("id", id);
    headings.push({ id, text, level: Number(node.rawTagName.slice(1)) });
  }

  // ---- sibling links -> app routes ---------------------------------------
  for (const link of prose.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href") ?? "";
    const sibling = href.match(/^([0-9]{2}-[a-z0-9-]+)\.html$/);
    if (sibling) link.setAttribute("href", `/posts/${post.series}/${sibling[1]}`);
    else if (href === "../../index.html") link.setAttribute("href", "/");
  }

  // ---- diagrams: the component owns the reveal state ---------------------
  for (const figure of prose.querySelectorAll("figure.diagram")) {
    figure.setAttribute("class", "diagram");
  }

  // Measured before the code panels are built, so panel chrome ("Go", "Copy
  // code") never lands in the word count.
  const text = prose.structuredText.replace(/\s+/g, " ").trim();
  const words = text.split(" ").length;

  // ---- code panels: highlight + label + always-on header strip ------------
  // Built here rather than in a client effect so the prerendered HTML already
  // carries the panel — no chrome popping in after hydration.
  for (const pre of prose.querySelectorAll("pre")) {
    const codeEl = pre.querySelector("code") ?? pre;
    const { html, label } = highlight(codeEl.text, post.series);
    pre.setAttribute("data-lang", label);
    codeEl.set_content(html);
    codeEl.setAttribute("class", "hljs");
    pre.replaceWith(
      parse(
        `<div class="code-panel"><div class="code-head">` +
          `<span class="code-lang mono">${escapeHtml(label)}</span>` +
          `<button class="code-copy" type="button" data-copy aria-label="Copy code">${COPY_ICON}</button>` +
          `</div>${pre.toString()}</div>`,
      ),
    );
  }

  // ---- callouts: mono label strip ----------------------------------------
  for (const callout of prose.querySelectorAll(".callout")) {
    const label = callout.querySelector(".k");
    if (label) label.setAttribute("class", "callout-label");
  }

  // Read time is authored per post, one span among several — matching against
  // the whole meta strip splices "PART 01 / 10" and "5 MIN" into "105 MIN".
  const authoredRead = doc
    .querySelectorAll(".post-meta span")
    .map((span) => span.structuredText.trim().match(/^(\d+)\s*MIN READ$/i)?.[1])
    .find(Boolean);
  const readMinutes = Number(authoredRead) || Math.max(1, Math.round(words / 220));

  return {
    key: `${post.series}/${post.file}`,
    ...post,
    seriesTitle: series.title,
    html: prose.innerHTML,
    headings,
    words,
    readMinutes,
    // Titles + deks + headings make a search index rich enough to find a page
    // without shipping 300KB of article text to every visitor.
    haystack: [post.title, post.dek, post.category, series.title, ...headings.map((h) => h.text)]
      .join(" ")
      .toLowerCase(),
  };
}

// -------------------------------------------------------------------------

const registry = JSON.parse(readFileSync(resolve(root, "src/content/registry.json"), "utf8"));
const seriesBySlug = new Map(registry.series.map((s) => [s.slug, s]));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(articleDir, { recursive: true });

const index = [];
for (const post of registry.posts) {
  const series = seriesBySlug.get(post.series);
  if (!series) throw new Error(`${post.file}: unknown series "${post.series}"`);
  const article = buildArticle(post, series);
  writeFileSync(
    resolve(articleDir, `${post.series}__${post.file}.json`),
    JSON.stringify(article),
  );
  const { html, ...meta } = article;
  index.push(meta);
}

index.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

writeFileSync(
  resolve(outDir, "index.json"),
  JSON.stringify({ series: registry.series, articles: index }, null, 2),
);

const totalWords = index.reduce((sum, a) => sum + a.words, 0);
console.log(
  `content: ${index.length} articles · ${registry.series.length} series · ${totalWords.toLocaleString()} words`,
);
