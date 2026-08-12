import { useEffect } from "react";

export type Theme = "light" | "dark";

/** Mirrors the pre-paint script in index.html — keep the two in step. */
function paint(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");
}

/** The OS decides, and keeps deciding: no toggle, no stored preference. The
 *  inline script has already painted the right theme before first paint, so
 *  this only has to follow the OS switching underneath us. */
export function SystemTheme() {
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => paint(media.matches ? "dark" : "light");
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return null;
}
