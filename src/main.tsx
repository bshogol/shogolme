import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { loadArticle } from "./lib/content";

const container = document.getElementById("root")!;

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

/** An article body is a separate chunk. Fetch it before hydrating so the first
 *  client render matches the prerendered HTML instead of blanking the page. */
async function preload() {
  const match = location.pathname.match(/^\/posts\/([^/]+)\/([^/]+?)(?:\.html)?\/?$/);
  if (match) await loadArticle(`${match[1]}/${match[2]}`);
}

preload().then(() => {
  if (container.firstChild) hydrateRoot(container, tree);
  else createRoot(container).render(tree);
});
