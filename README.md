# shogol.me

The Shogol blog — a pure static site, no build step, no backend.
Theme: **Kinetic** (light + dark). Series: *From Tokens to Agents*.

## Structure

```
index.html              landing page + list of all posts
assets/
  kinetic.css           the whole theme (light + dark via [data-theme])
  theme.js              dark/light toggle + scroll-reveal + diagram draw-on
posts/
  NN-slug.html          one self-contained page per post
```

Every page links the two shared assets, so a single CSS edit restyles the whole site.
Light is the default; the toggle persists to `localStorage` and respects
`prefers-color-scheme` on first visit (set before paint, so no flash).

## Run locally

It's plain static files — open `index.html` directly, or serve the folder:

```bash
cd /Users/boris/workspace/shogol/shogol.me
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploy (GitHub + Vercel, no backend)

Push to `main` → Vercel auto-deploys.

```bash
git add -A && git commit -m "…" && git push
```

In Vercel: import the `bshogol/shogolme` repo, Framework Preset = **Other**
(no build command, output directory = `/`). No env vars, no functions.

## Add a new post

Posts are written directly as HTML in the Kinetic style — no markdown conversion.

1. Copy an existing post (e.g. `posts/01-the-big-picture.html`) to
   `posts/NN-slug.html` and replace: `<title>`, the marquee text, `.post-meta`
   (PART NN / 15 · read time · category), `.post-title`, `.post-dek`, the
   `.prose` article body, and the `.pn` prev/next links.
2. Build at least one bespoke inline-SVG diagram using the theme-aware classes
   (`dgm-box`, `dgm-flow`, `dgm-ink`, `dgm-accent`, …) with `class="draw"` +
   `pathLength="1"` on connectors and `class="pop"` on boxes so they animate on scroll.
   **Never hardcode colors** in SVG — use the `dgm-*` classes so light/dark both work.
3. Add a `.row` link to the post in `index.html`.
4. Open locally, eyeball light **and** dark.
5. `git add -A && git commit -m "post: <title>" && git push` → Vercel deploys.

No config changes, no build — publishing is just adding files + a link.
