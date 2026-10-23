import { useEffect } from "react";

export type PageMeta = {
  title: string;
  description: string;
  /** Site path. Home is `/`, and its canonical keeps the trailing slash. */
  path?: string;
  /** 404: noindex, and no canonical link. */
  noindex?: boolean;
  type?: "website" | "article";
  /** Article title for BlogPosting. The document title keeps the series suffix. */
  headline?: string;
  /** `YYYY-MM-DD` from the content registry. */
  published?: string;
};

export const SITE = "https://shogol.me";
export const AUTHOR = "Boris Shogol";
export const SITE_DESCRIPTION = "Long-form series on AI, Go, and philosophy by Boris Shogol.";
export const DEFAULT_TITLE = "Shogol — Long-form series on AI, Go, and philosophy";
export const OG_IMAGE = `${SITE}/og.png`;

const WEBSITE_ID = `${SITE}/#website`;

let captured: PageMeta | null = null;

/** The prerenderer reads whatever the rendered page declared. */
export function takeCapturedMeta(): PageMeta | null {
  const meta = captured;
  captured = null;
  return meta;
}

/** Home is `https://shogol.me/`. Every other path is slash-free. */
export function canonical(path: string): string {
  if (path === "/" || path === "") return `${SITE}/`;
  return `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: "Shogol",
    url: `${SITE}/`,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    author: { "@type": "Person", name: AUTHOR },
  };
}

export function structuredData(meta: PageMeta): Record<string, unknown> | null {
  if (meta.noindex) return null;
  const url = canonical(meta.path ?? "/");
  const website = websiteNode();
  if (meta.type === "article" && meta.published) {
    return {
      "@context": "https://schema.org",
      "@graph": [
        website,
        {
          "@type": "BlogPosting",
          headline: meta.headline ?? meta.title,
          description: meta.description,
          datePublished: meta.published,
          url,
          mainEntityOfPage: url,
          image: OG_IMAGE,
          inLanguage: "en",
          author: { "@type": "Person", name: AUTHOR },
          isPartOf: { "@id": WEBSITE_ID },
        },
      ],
    };
  }
  return { "@context": "https://schema.org", ...website };
}

/** Tags injected before `</head>`. Title and description are updated separately. */
export function renderExtraHead(meta: PageMeta): string {
  const url = meta.noindex ? null : canonical(meta.path ?? "/");
  const tags: string[] = [];
  if (url) tags.push(`<link rel="canonical" href="${esc(url)}" data-seo="canonical" />`);
  else tags.push(`<meta name="robots" content="noindex" data-seo="robots" />`);

  if (url) tags.push(`<meta property="og:url" content="${esc(url)}" data-seo="og:url" />`);
  tags.push(`<meta property="og:title" content="${esc(meta.title)}" data-seo="og:title" />`);
  tags.push(`<meta property="og:description" content="${esc(meta.description)}" data-seo="og:description" />`);
  tags.push(
    `<meta property="og:type" content="${meta.type === "article" ? "article" : "website"}" data-seo="og:type" />`,
  );
  tags.push(`<meta property="og:image" content="${OG_IMAGE}" data-seo="og:image" />`);
  tags.push(`<meta property="og:image:width" content="1200" data-seo="og:image:width" />`);
  tags.push(`<meta property="og:image:height" content="630" data-seo="og:image:height" />`);
  tags.push(`<meta property="og:image:alt" content="Shogol" data-seo="og:image:alt" />`);
  tags.push(`<meta property="og:site_name" content="Shogol" data-seo="og:site_name" />`);
  tags.push(`<meta name="twitter:card" content="summary_large_image" data-seo="twitter:card" />`);
  tags.push(`<meta name="twitter:title" content="${esc(meta.title)}" data-seo="twitter:title" />`);
  tags.push(`<meta name="twitter:description" content="${esc(meta.description)}" data-seo="twitter:description" />`);
  tags.push(`<meta name="twitter:image" content="${OG_IMAGE}" data-seo="twitter:image" />`);
  tags.push(
    `<link rel="alternate" type="application/rss+xml" title="Shogol" href="${SITE}/rss.xml" data-seo="rss" />`,
  );
  tags.push(
    `<link rel="alternate" type="application/atom+xml" title="Shogol" href="${SITE}/atom.xml" data-seo="atom" />`,
  );

  const data = structuredData(meta);
  if (data) {
    const json = JSON.stringify(data).replace(/</g, "\\u003c");
    tags.push(`<script type="application/ld+json" data-seo="jsonld">${json}</script>`);
  }
  return tags.join("\n  ");
}

export function usePageMeta(meta: PageMeta): void {
  // During a server render there is no effect phase, so the value is stashed
  // synchronously for the prerenderer to pick up.
  if (typeof document === "undefined") captured = meta;

  useEffect(() => {
    document.title = meta.title;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = meta.description;
    document.head.querySelectorAll("[data-seo]").forEach((node) => node.remove());
    document.head.insertAdjacentHTML("beforeend", renderExtraHead(meta));
  }, [meta.title, meta.description, meta.path, meta.noindex, meta.type, meta.headline, meta.published]);
}
