/* Turns the SPA into 30 static pages.
 *
 * A client-rendered blog is an empty <div> to anything that doesn't run JS, so
 * every route is rendered to HTML at build time with the real title, meta
 * description and canonical link. The client bundle then hydrates it.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

const { render, routes } = await import(resolve(root, "dist-ssr/entry-server.js"));
const template = readFileSync(resolve(dist, "index.html"), "utf8");

const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

for (const route of routes) {
  const { html, meta, canonical } = await render(route.url);

  const page = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(meta.title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escape(meta.description)}" />`,
    )
    .replace("</head>", `  <link rel="canonical" href="${canonical}" />\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

  const out = resolve(dist, route.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page);
}

rmSync(resolve(root, "dist-ssr"), { recursive: true, force: true });
console.log(`prerender: ${routes.length} pages`);
