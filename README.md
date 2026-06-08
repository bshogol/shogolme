# shogol.me

The Shogol blog — a pure static site, no build step, no backend.
Theme: **Kinetic** (light + dark). Multi-series: the homepage is one date-sorted
timeline of every post, with chips to filter to a single series.

## Structure

```
index.html              homepage: site masthead + series filter chips + date-sorted timeline
series.html             ONE dynamic series page — reads ?s=<series-slug> from the manifest
assets/
  kinetic.css           the whole theme (light + dark via [data-theme])
  posts.js              THE MANIFEST — every series + every post (date, title, url). Source of truth.
  site.js               renders the homepage feed + the series page from the manifest
  theme.js              dark/light toggle + scroll-reveal + diagram draw-on
posts/
  <series-slug>/
    NN-slug.html        one self-contained page per post
```

Current series: `tokens-to-agents` (*From Tokens to Agents*, 15 parts) and
`advanced-go-patterns` (*Advanced Go Patterns*, 10 parts).

The homepage and series page render entirely from `assets/posts.js` — no backend,
no build. Light is default; the toggle persists to `localStorage` and respects
`prefers-color-scheme` (set before paint, so no flash).

## Run locally

```bash
cd /Users/boris/workspace/shogol/shogol.me
python3 -m http.server 8080
# open http://localhost:8080
```

(Open `index.html` directly works too, except `series.html`'s `?s=` query — use the
server for that.)

## Deploy (GitHub + Vercel, no backend)

Push to `main` → Vercel auto-deploys.

```bash
git add -A && git commit -m "…" && git push
```

In Vercel: import `bshogol/shogolme`, Framework Preset = **Other** (no build command,
output `/`). No env vars, no functions. `vercel.json` gives clean URLs.

## Add a new post to an existing series

1. Create `posts/<series-slug>/NN-slug.html`. Easiest: copy a sibling post (e.g.
   `posts/advanced-go-patterns/01-functional-options.html`) and replace `<title>`,
   the marquee text, `.post-meta` (date · PART NN / TOTAL · read time · category),
   `.post-title`, `.post-dek`, the `.prose` body, and the `.pn` prev/next links.
   Keep the `../../assets/...` paths and the no-FOUC `<head>` script as-is.
2. Build at least one bespoke inline-SVG diagram with the theme-aware classes
   (`dgm-box`, `dgm-flow`, `dgm-ink`, `dgm-accent`, …), `class="draw"` + `pathLength="1"`
   on connectors and `class="pop"` on boxes so it animates on scroll.
   **Never hardcode SVG colors** — use the `dgm-*` classes so light/dark both work.
3. Add ONE entry to `SHOGOL_POSTS` in `assets/posts.js` (series, part, date, category,
   title, dek, url). That's what puts it in the timeline + series page.
4. Open locally, eyeball light **and** dark, then commit + push.

## Add a whole new series

1. Add an entry to `SHOGOL_SERIES` in `assets/posts.js`:
   `"my-slug": { title, tag, blurb }`. A filter chip and a working
   `series.html?s=my-slug` page appear automatically — **no new page files needed**.
2. Create the folder `posts/my-slug/` and add posts as above, each with a manifest entry.

## Notes for batch conversion (markdown → HTML)

When converting a series of markdown drafts at once, run **one sub-agent per file**,
each mirroring an existing post (e.g. `posts/tokens-to-agents/01-the-big-picture.html`)
as the structural template and authoring bespoke SVG diagrams from that post's content.
Then add all the manifest entries to `posts.js`.
