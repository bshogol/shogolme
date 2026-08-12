import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type Theme = "light" | "dark";

const STORAGE_KEY = "shogol-theme";

type ThemeValue = { mode: ThemeMode; theme: Theme; setMode: (mode: ThemeMode) => void; cycle: () => void };

const ThemeContext = createContext<ThemeValue>({
  mode: "system",
  theme: "light",
  setMode: () => {},
  cycle: () => {},
});

function storedMode(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

function systemTheme(): Theme {
  if (typeof matchMedia === "undefined") return "light";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Mirrors the pre-paint script in index.html — keep the two in step. */
function paint(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [system, setSystem] = useState<Theme>("light");

  // Read after mount: the server render has no localStorage and no OS to ask,
  // and the inline script has already painted the right theme by now.
  useEffect(() => {
    setModeState(storedMode());
    setSystem(systemTheme());
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const theme: Theme = mode === "system" ? system : mode;

  useEffect(() => {
    paint(theme);
  }, [theme]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    if (next === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const cycle = useCallback(() => {
    setModeState((current) => {
      const next: ThemeMode = current === "light" ? "dark" : current === "dark" ? "system" : "light";
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, theme, setMode, cycle }), [mode, theme, setMode, cycle]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
