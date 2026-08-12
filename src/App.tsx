import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Route, Routes, useLocation } from "react-router";
import { ThemeProvider } from "./lib/theme";
import { Article } from "./pages/Article";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Series } from "./pages/Series";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/home.css";
import "./styles/wiki.css";
import "./styles/code.css";

export function App() {
  return (
    <ThemeProvider>
      <ScrollToTop />
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/series/:slug" element={<Series />} />
        <Route path="/posts/:series/:file" element={<Article />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* Web Analytics. The package (rather than the bare script tag the old
          static site used) reports client-side route changes as pageviews. */}
      <Analytics />
    </ThemeProvider>
  );
}

/** New page, top of the page — unless the URL points at a heading. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
