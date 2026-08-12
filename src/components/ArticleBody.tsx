import { useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router";

/** Arming the hidden state has to happen before paint, and the prerenderer has
 *  no paint to be before. */
const useArmEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Renders a generated article body and wires the three things the static
 *  markup can't do for itself: in-app links, diagram reveals, copy buttons. */
export function ArticleBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // In-app navigation for the sibling links baked into the prose.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as HTMLElement).closest("a");
      const href = link?.getAttribute("href");
      if (!link || !href || !href.startsWith("/")) return;
      event.preventDefault();
      navigate(href);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [navigate, html]);

  // Copy buttons. Delegated, so re-rendered bodies never leak listeners.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const onClick = async (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-copy]");
      const code = button?.parentElement?.parentElement?.querySelector("pre");
      if (!button || !code) return;
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.classList.add("is-copied");
        setTimeout(() => button.classList.remove("is-copied"), 1400);
      } catch {
        // Clipboard gated (insecure context, denied permission) — say nothing.
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [html]);

  // Diagrams render visible; the hidden state is armed before paint and
  // released on intersection, so no-JS and pre-hydration paints see the page.
  useArmEffect(() => {
    const root = ref.current;
    if (!root) return;
    const diagrams = Array.from(root.querySelectorAll<HTMLElement>(".diagram"));
    if (!diagrams.length) return;

    if (typeof IntersectionObserver === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      diagrams.forEach((figure) => figure.classList.add("is-in"));
      return;
    }

    diagrams.forEach((figure) => figure.classList.add("is-armed"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    diagrams.forEach((figure) => observer.observe(figure));
    return () => observer.disconnect();
  }, [html]);

  return <div className="prose" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
