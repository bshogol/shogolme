import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router";
import { series } from "../lib/content";
import { SearchPalette } from "./SearchPalette";

/** Fixed 64px bar: transparent at rest, glass once the page scrolls. */
export function SiteHeader({ fullBleed = false }: { fullBleed?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className={`bar${scrolled || menuOpen ? " is-solid" : ""}`}>
        <div className={`bar-in${fullBleed ? " bar-in--wide" : ""}`}>
          <div className="bar-left">
            <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
              <span className="brand-mark" aria-hidden="true">
                S
              </span>
              <span className="brand-word">shogol</span>
            </Link>
            <nav className="bar-nav" aria-label="Primary">
              <NavLink to="/" end>
                Index
              </NavLink>
              {series.map((s) => (
                <NavLink key={s.slug} to={`/series/${s.slug}`}>
                  {s.title}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="bar-right">
            <button className="search-trigger" onClick={() => setSearchOpen(true)}>
              <SearchIcon />
              <span className="search-trigger-label">Search</span>
              <kbd className="mono">⌘K</kbd>
            </button>
            <a className="btn btn--ghost bar-github" href="https://github.com/bshogol" target="_blank" rel="noopener">
              GitHub
            </a>
            <button
              className="icon-btn bar-burger"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="bar-drawer">
            <Link to="/" onClick={() => setMenuOpen(false)}>
              Index
            </Link>
            {series.map((s) => (
              <Link key={s.slug} to={`/series/${s.slug}`} onClick={() => setMenuOpen(false)}>
                {s.title}
              </Link>
            ))}
            <a href="https://github.com/bshogol" target="_blank" rel="noopener">
              GitHub
            </a>
          </div>
        )}
      </header>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </svg>
  );
}
