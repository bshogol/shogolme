# shogol.me

The Shogol wiki — long-form series presented as reference articles rather than a
blog feed. React + TypeScript on Vite, prerendered to static HTML at build time.

Design language: **dflux frontend**. Two scopes, deliberately different:

- **Site shell** (home, series, 404) — marketing scope: pure white/black ground,
  hairline rules, blue only as a pointer (eyebrow dot, focus rings, hover ink).
- **Article pages** — docs scope: one neutral grey ramp all the way down, no
  brand hue at all. Sticky series rail on the left, article in the middle, "on
  this page" outline on the right. Colour appears only where colour is the
  message: syntax highlighting and warning callouts.

Theme is system-only: `prefers-color-scheme` decides, there is no toggle and no
stored preference. It is painted before first paint, so no flash, and it follows
the OS switching while the page is open.

## Structure

```
posts/<series>/NN-slug.html   THE CONTENT. Hand-written article HTML — still the source of truth.
src/content/registry.json     THE MANIFEST. Every series + every post (date, part, category, title, dek).
scripts/gen-content.mjs       Build step: lifts each .prose block out of the HTML, ids the headings,
                              highlights code, and writes src/content/generated/ (gitignored).
scripts/prerender.mjs         Build step: renders all 30 routes to static HTML with real <title>,
                              meta description and canonical link.
src/pages/                    Home · Series · Article · NotFound
src/components/               SiteHeader (64px bar + ⌘K palette) · SiteFooter · ArticleBody
src/styles/                   tokens · base (shell) · home (marketing) · wiki (docs) · code
```

The article HTML in `posts/` is an input, not a served page: the generator reads
the `.prose` block and the app supplies all chrome. The old per-post `<head>`,
marquee, header and prev/next markup is ignored — leaving it in place is
harmless, and new posts don't need it.

## Run locally

```bash
npm install
npm run dev      # regenerates content, then Vite dev server
npm run build    # gen → tsc → client build → SSR build → prerender to dist/
npm run preview  # serve dist/ (note: unknown paths fall back to index.html here,
                 # where Vercel serves 404.html — an expected local-only difference)
```

## Deploy (GitHub + Vercel)

Push to `main` → Vercel auto-deploys. Framework preset **Vite**, build command
`npm run build`, output `dist`. `vercel.json` keeps `cleanUrls` on, so
`/posts/<series>/NN-slug.html` and `/posts/<series>/NN-slug` both resolve —
every URL the old static site published still works.

## Add a new post to an existing series

1. Create `posts/<series>/NN-slug.html`. Only two things are read from it:
   - `<h1 class="post-title">` / `<p class="post-dek">` / `.post-meta` (for read time)
   - `<div class="prose">` — the body
2. Inside `.prose`, use plain semantic HTML: `h2`/`h3`/`h4` (ids are generated),
   `p`, `ul`, `ol`, `pre><code` (language is auto-detected and highlighted at
   build time), `<div class="callout"><div class="k">Label</div><p>…</p></div>`,
   and `<figure class="diagram">` for bespoke inline SVG.
3. Diagrams: use the theme-aware classes (`dgm-box`, `dgm-box-accent`, `dgm-flow`,
   `dgm-line`, `dgm-ink`, `dgm-muted`, `dgm-accent`, `dgm-title`), `class="draw"` +
   `pathLength="1"` on connectors and `class="pop"` on boxes so they animate in.
   **Never hardcode SVG colours** — the classes carry the light/dark ramp, and in
   the article scope they resolve to neutral ink steps, never blue.
4. Add one entry to `posts` in `src/content/registry.json`
   (`series`, `part`, `date`, `category`, `title`, `dek`, `file`). That places it
   in the index, the search, the series rail and the prev/next links.
5. `npm run dev`, check light **and** dark, then commit.

## Add a whole new series

Add an entry to `series` in `src/content/registry.json`
(`slug`, `order`, `title`, `tag`, `blurb`), create `posts/<slug>/`, and add posts
as above. The nav link, the `/series/<slug>` page and the home index section all
appear on their own — no new page files.
