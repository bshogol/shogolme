import { useEffect } from "react";

export type PageMeta = { title: string; description: string; path?: string };

const SITE = "https://shogol.me";

let captured: PageMeta | null = null;

/** The prerenderer reads whatever the rendered page declared. */
export function takeCapturedMeta(): PageMeta | null {
  const meta = captured;
  captured = null;
  return meta;
}

export function canonical(path: string): string {
  return `${SITE}${path === "/" ? "" : path}`;
}

export function usePageMeta({ title, description, path }: PageMeta): void {
  // During a server render there is no effect phase, so the value is stashed
  // synchronously for the prerenderer to pick up.
  if (typeof document === "undefined") captured = { title, description, path };

  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical(path ?? location.pathname);
  }, [title, description, path]);
}
