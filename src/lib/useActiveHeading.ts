import { useEffect, useState } from "react";
import type { Heading } from "./content";

/** Active outline row from scroll position, not IntersectionObserver: an
 *  observer only reports headings inside its band, so nothing is highlighted
 *  while you read a long section. The last heading above a reading line at
 *  y=96 wins, and the final heading pins once the page is scrolled out. */
export function useActiveHeading(headings: Heading[]): string {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (!headings.length) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 24;
      if (atBottom) {
        setActive(headings[headings.length - 1].id);
        return;
      }
      let current = headings[0].id;
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (element && element.getBoundingClientRect().top <= 96) current = heading.id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  return active;
}
