import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Route, Routes, useLocation } from "react-router";
import { SystemTheme } from "./lib/theme";
import { Article } from "./pages/Article";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Series } from "./pages/Series";
import { SeriesIndex } from "./pages/SeriesIndex";

import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/home.css";
import "./styles/wiki.css";
import "./styles/code.css";

export function App() {
  return (
    <>
      <SystemTheme />
      <ScrollToTop />
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/series" element={<SeriesIndex />} />
        <Route path="/series/:slug" element={<Series />} />
        <Route path="/posts/:series/:file" element={<Article />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* Web Analytics. The package (rather than the bare script tag the old
          static site used) reports client-side route changes as pageviews. */}
      <Analytics />
    </>
  );
}

/** New page, top of the page — unless the URL points at a heading.
 *  Article headings arrive with the body chunk, so a missing target is retried
 *  until it exists (Article also scrolls once that chunk commits). */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const raw = hash.slice(1);
    let id = raw;
    try {
      id = decodeURIComponent(raw);
    } catch {
      id = raw;
    }
    let frames = 0;
    let raf = 0;
    const tick = () => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView();
        return;
      }
      frames += 1;
      if (frames < 90) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);
  return null;
}
